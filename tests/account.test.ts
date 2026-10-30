// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../convex/_generated/api'
import schema from '../convex/schema'
import { DEMO_EMAIL } from '../shared/demo-account'
import { clerkIdFor } from './helpers/clerk-id'

const modules = import.meta.glob('../convex/**/*.ts')

async function setup(email: string) {
  const t = convexTest(schema, modules)
  const clerkId = clerkIdFor(email)
  const userId = await t.run((ctx) => ctx.db.insert('users', { email, clerkId }))
  return { t, userId, clerkId, me: t.withIdentity({ subject: clerkId }) }
}

const okResponse = () => new Response(JSON.stringify({ deleted: true }), { status: 200 })

beforeEach(() => {
  vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_secret')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('account.deleteMyAccount', () => {
  it('wipes the user and their data, removes the Clerk login, keeps other users and app-wide counters', async () => {
    const fetchMock = vi.fn(async () => okResponse())
    vi.stubGlobal('fetch', fetchMock)
    const { t, userId, clerkId, me } = await setup('user@example.com')
    const otherId = await t.run((ctx) => ctx.db.insert('users', { email: 'other@example.com', clerkId: clerkIdFor('other@example.com') }))
    await t.run(async (ctx) => {
      await ctx.db.insert('usageCounters', { name: 'youcam_units', value: 12 })
      await ctx.db.insert('scans', { userId, createdAt: 1, scores: { acne: 50 }, noise: { acne: 1 }, qualityFlag: false })
    })
    await me.mutation(api.products.create, { name: 'Serum', targetConcern: 'acne' })

    await me.action(api.account.deleteMyAccount, {})

    const left = await t.run(async (ctx) => ({
      users: await ctx.db.query('users').collect(),
      products: await ctx.db.query('products').collect(),
      scans: await ctx.db.query('scans').collect(),
      verdicts: await ctx.db.query('verdicts').collect(),
      counters: await ctx.db.query('usageCounters').collect(),
    }))
    expect(left.users.map((u) => u._id)).toEqual([otherId])
    expect(left.products).toEqual([])
    expect(left.scans).toEqual([])
    expect(left.verdicts).toEqual([])
    expect(left.counters).toHaveLength(1)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`https://api.clerk.com/v1/users/${clerkId}`)
    expect(init.method).toBe('DELETE')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk_test_secret')
  })

  it('refuses to delete the demo account and does not call Clerk', async () => {
    const fetchMock = vi.fn(async () => okResponse())
    vi.stubGlobal('fetch', fetchMock)
    const { t, me } = await setup(DEMO_EMAIL)
    await expect(me.action(api.account.deleteMyAccount, {})).rejects.toMatchObject({ data: { code: 'DEMO_ACCOUNT' } })
    expect(await t.run((ctx) => ctx.db.query('users').collect())).toHaveLength(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requires sign-in', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()))
    const t = convexTest(schema, modules)
    await expect(t.action(api.account.deleteMyAccount, {})).rejects.toMatchObject({ data: { code: 'NOT_AUTHENTICATED' } })
  })

  it('wipes nothing when the Clerk secret key is missing', async () => {
    vi.stubEnv('CLERK_SECRET_KEY', '')
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()))
    const { t, me } = await setup('user@example.com')
    await expect(me.action(api.account.deleteMyAccount, {})).rejects.toMatchObject({ data: { code: 'NOT_CONFIGURED' } })
    expect(await t.run((ctx) => ctx.db.query('users').collect())).toHaveLength(1)
  })

  it('reports a Clerk failure instead of pretending the login is gone', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })))
    const { me } = await setup('user@example.com')
    await expect(me.action(api.account.deleteMyAccount, {})).rejects.toThrow(/status 500/)
  })
})

describe('account.me', () => {
  it('reports the email and whether it is the demo account', async () => {
    const demo = await setup(DEMO_EMAIL)
    expect(await demo.me.query(api.account.me, {})).toEqual({ email: DEMO_EMAIL, isDemoAccount: true })
    const normal = await setup('user@example.com')
    expect(await normal.me.query(api.account.me, {})).toEqual({ email: 'user@example.com', isDemoAccount: false })
    expect(await normal.t.query(api.account.me, {})).toBeNull()
  })
})
