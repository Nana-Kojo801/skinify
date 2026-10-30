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

const clerkUser = (overrides: { status?: string; first?: string | null; last?: string | null } = {}) =>
  json({
    first_name: overrides.first === undefined ? 'New' : overrides.first,
    last_name: overrides.last === undefined ? 'Person' : overrides.last,
    primary_email_address_id: 'idn_1',
    email_addresses: [
      { id: 'idn_0', email_address: 'other@example.com', verification: { status: 'verified' } },
      { id: 'idn_1', email_address: 'new@example.com', verification: { status: overrides.status ?? 'verified' } },
    ],
  })

describe('users.store', () => {
  it('creates the users row on the first visit with the verified email from Clerk, and reuses it afterwards', async () => {
    const fetchMock = vi.fn(async () => clerkUser())
    vi.stubGlobal('fetch', fetchMock)
    const t = convexTest(schema, modules)
    const me = t.withIdentity({ subject: 'user_abc' })
    // Before storing there is no row, so queries behave as signed-out instead of failing.
    expect(await me.query(api.products.list, {})).toEqual([])
    expect(await me.query(api.account.me, {})).toBeNull()

    const first = await me.action(api.users.store, {})
    const second = await me.action(api.users.store, {})
    expect(second).toBe(first)
    expect(fetchMock).toHaveBeenCalledTimes(1) // the second visit already has an email
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('https://api.clerk.com/v1/users/user_abc')
    const users = await t.run((ctx) => ctx.db.query('users').collect())
    expect(users).toHaveLength(1)
    expect(users[0]).toMatchObject({ clerkId: 'user_abc', email: 'new@example.com', name: 'New Person' })
    expect(await me.query(api.account.me, {})).toEqual({ email: 'new@example.com', isDemoAccount: false })
  })

  it('never stores an unverified email', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => clerkUser({ status: 'unverified', first: null, last: null })))
    const t = convexTest(schema, modules)
    await t.withIdentity({ subject: 'user_abc' }).action(api.users.store, {})
    const [user] = await t.run((ctx) => ctx.db.query('users').collect())
    expect(user.email).toBeUndefined()
    expect(user.name).toBeUndefined()
  })

  it('still signs people in when Clerk is unreachable, and fills the email in on the next visit', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    const t = convexTest(schema, modules)
    const me = t.withIdentity({ subject: 'user_abc' })
    const id = await me.action(api.users.store, {})
    expect((await t.run((ctx) => ctx.db.get(id)))?.email).toBeUndefined()

    fetchMock.mockImplementation(async () => clerkUser())
    expect(await me.action(api.users.store, {})).toBe(id)
    expect((await t.run((ctx) => ctx.db.get(id)))?.email).toBe('new@example.com')
  })

  it('works without the Clerk secret key (no email yet) and keeps people separate', async () => {
    vi.stubEnv('CLERK_SECRET_KEY', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const t = convexTest(schema, modules)
    const a = await t.withIdentity({ subject: 'user_a' }).action(api.users.store, {})
    const b = await t.withIdentity({ subject: 'user_b' }).action(api.users.store, {})
    expect(b).not.toBe(a)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requires sign-in', async () => {
    const t = convexTest(schema, modules)
    await expect(t.action(api.users.store, {})).rejects.toMatchObject({ data: { code: 'NOT_AUTHENTICATED' } })
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
