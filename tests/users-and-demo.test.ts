// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '../convex/_generated/api'
import schema from '../convex/schema'
import { DEMO_EMAIL } from '../shared/demo-account'
import { clerkIdFor } from './helpers/clerk-id'

const modules = import.meta.glob('../convex/**/*.ts')
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

beforeEach(() => {
  vi.stubEnv('CLERK_SECRET_KEY', 'sk_test_secret')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('users.store', () => {
  it('creates the users row on the first visit and reuses it afterwards', async () => {
    const t = convexTest(schema, modules)
    const me = t.withIdentity({ subject: 'user_abc', email: 'new@example.com', name: 'New Person' })
    // Before storing there is no row, so queries behave as signed-out instead of failing.
    expect(await me.query(api.products.list, {})).toEqual([])
    expect(await me.query(api.account.me, {})).toBeNull()

    const first = await me.mutation(api.users.store, {})
    const second = await me.mutation(api.users.store, {})
    expect(second).toBe(first)
    const users = await t.run((ctx) => ctx.db.query('users').collect())
    expect(users).toHaveLength(1)
    expect(users[0]).toMatchObject({ clerkId: 'user_abc', email: 'new@example.com', name: 'New Person' })
    expect(await me.query(api.account.me, {})).toEqual({ email: 'new@example.com', isDemoAccount: false })
  })

  it('keeps the email current and keeps people separate', async () => {
    const t = convexTest(schema, modules)
    const a = await t.withIdentity({ subject: 'user_a', email: 'a@example.com' }).mutation(api.users.store, {})
    await t.withIdentity({ subject: 'user_a', email: 'a2@example.com' }).mutation(api.users.store, {})
    const b = await t.withIdentity({ subject: 'user_b', email: 'a2@example.com' }).mutation(api.users.store, {})
    expect(b).not.toBe(a)
    expect((await t.run((ctx) => ctx.db.get(a)))?.email).toBe('a2@example.com')
  })

  it('requires sign-in', async () => {
    const t = convexTest(schema, modules)
    await expect(t.mutation(api.users.store, {})).rejects.toMatchObject({ data: { code: 'NOT_AUTHENTICATED' } })
  })
})

describe('demo.ticket', () => {
  it('mints a short-lived one-time sign-in ticket for the demo user, without any sign-in', async () => {
    const fetchMock = vi.fn(async () => json({ token: 'ticket-123' }))
    vi.stubGlobal('fetch', fetchMock)
    const t = convexTest(schema, modules)
    await t.run((ctx) => ctx.db.insert('users', { email: DEMO_EMAIL, clerkId: clerkIdFor(DEMO_EMAIL) }))

    expect(await t.action(api.demo.ticket, {})).toBe('ticket-123')

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.clerk.com/v1/sign_in_tokens')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ user_id: clerkIdFor(DEMO_EMAIL), expires_in_seconds: 60 })
  })

  it('says the demo is unavailable when it has not been set up', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const t = convexTest(schema, modules)
    await expect(t.action(api.demo.ticket, {})).rejects.toMatchObject({ data: { code: 'DEMO_UNAVAILABLE' } })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('needs the Clerk secret key', async () => {
    vi.stubEnv('CLERK_SECRET_KEY', '')
    const t = convexTest(schema, modules)
    await expect(t.action(api.demo.ticket, {})).rejects.toMatchObject({ data: { code: 'NOT_CONFIGURED' } })
  })
})

describe('seed.resetDemo', () => {
  it('creates the Clerk user and the users row, seeds the data, and is safe to repeat', async () => {
    const clerkUsers: { id: string; email: string }[] = []
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST' && url.endsWith('/users')) {
        const body = JSON.parse(init.body as string)
        expect(body.skip_password_requirement).toBe(true)
        clerkUsers.push({ id: 'user_demo', email: body.email_address[0] })
        return json({ id: 'user_demo' })
      }
      const email = decodeURIComponent(new URL(url).searchParams.get('email_address') ?? '')
      return json(clerkUsers.filter((u) => u.email === email))
    })
    vi.stubGlobal('fetch', fetchMock)
    const t = convexTest(schema, modules)

    const first = await t.action(internal.seed.resetDemo, {})
    expect(first.created).toBe(true)
    expect(first.products.map((p) => p.verdict)).toEqual(['WORKING', 'NO_VISIBLE_CHANGE', 'CANT_TELL'])
    const second = await t.action(internal.seed.resetDemo, {})
    expect(second.created).toBe(false)
    expect(second.userId).toBe(first.userId)
    expect(clerkUsers).toHaveLength(1)

    expect(await t.query(internal.seed.findDemoClerkId, {})).toBe('user_demo')
    expect(await t.run((ctx) => ctx.db.query('users').collect())).toHaveLength(1)
  })
})

describe('cutover.wipeLegacyAccounts', () => {
  it('removes accounts that predate Clerk with their data, and leaves Clerk users alone', async () => {
    const t = convexTest(schema, modules)
    const { legacy, clerkUser } = await t.run(async (ctx) => {
      const legacy = await ctx.db.insert('users', { email: 'old@example.com' })
      const clerkUser = await ctx.db.insert('users', { email: 'new@example.com', clerkId: 'user_new' })
      await ctx.db.insert('products', { userId: legacy, name: 'Old', targetConcern: 'acne', startDate: 0 })
      await ctx.db.insert('products', { userId: clerkUser, name: 'New', targetConcern: 'acne', startDate: 0 })
      await ctx.db.insert('scans', { userId: legacy, createdAt: 1, scores: { acne: 1 }, noise: { acne: 1 }, qualityFlag: false })
      await ctx.db.insert('authAccounts', { userId: legacy, provider: 'password', providerAccountId: 'old@example.com' })
      await ctx.db.insert('authSessions', { userId: legacy })
      await ctx.db.insert('usageCounters', { name: 'youcam_units', value: 5 })
      return { legacy, clerkUser }
    })

    expect(await t.mutation(internal.cutover.wipeLegacyAccounts, {})).toEqual({ users: 1, authDocs: 2 })
    expect(await t.mutation(internal.cutover.wipeLegacyAccounts, {})).toEqual({ users: 0, authDocs: 0 })

    const left = await t.run(async (ctx) => ({
      users: (await ctx.db.query('users').collect()).map((u) => u._id),
      products: (await ctx.db.query('products').collect()).map((p) => p.name),
      scans: await ctx.db.query('scans').collect(),
      counters: await ctx.db.query('usageCounters').collect(),
    }))
    expect(left.users).toEqual([clerkUser])
    expect(left.users).not.toContain(legacy)
    expect(left.products).toEqual(['New'])
    expect(left.scans).toEqual([])
    expect(left.counters).toHaveLength(1)
  })
})
