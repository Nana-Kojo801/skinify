// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from '../convex/_generated/api'
import schema from '../convex/schema'
import { DEMO_EMAIL } from '../shared/demo-account'

const modules = import.meta.glob('../convex/**/*.ts')

async function setup(email: string) {
  const t = convexTest(schema, modules)
  const userId = await t.run((ctx) => ctx.db.insert('users', { email }))
  return { t, userId, me: t.withIdentity({ subject: `${userId}|session` }) }
}

describe('account.deleteMyAccount', () => {
  it('wipes the user and their data but keeps other users and app-wide counters', async () => {
    const { t, userId, me } = await setup('user@example.com')
    const otherId = await t.run((ctx) => ctx.db.insert('users', { email: 'other@example.com' }))
    await t.run(async (ctx) => {
      const accountId = await ctx.db.insert('authAccounts', { userId, provider: 'password', providerAccountId: 'user@example.com' })
      await ctx.db.insert('authVerificationCodes', { accountId, provider: 'password', code: 'x', expirationTime: 1 })
      await ctx.db.insert('authAccounts', { userId: otherId, provider: 'password', providerAccountId: 'other@example.com' })
      await ctx.db.insert('usageCounters', { name: 'youcam_units', value: 12 })
      await ctx.db.insert('scans', { userId, createdAt: 1, scores: { acne: 50 }, noise: { acne: 1 }, qualityFlag: false })
    })
    await me.mutation(api.products.create, { name: 'Serum', targetConcern: 'acne' })

    await me.mutation(api.account.deleteMyAccount, {})

    const left = await t.run(async (ctx) => ({
      users: await ctx.db.query('users').collect(),
      accounts: await ctx.db.query('authAccounts').collect(),
      codes: await ctx.db.query('authVerificationCodes').collect(),
      products: await ctx.db.query('products').collect(),
      scans: await ctx.db.query('scans').collect(),
      verdicts: await ctx.db.query('verdicts').collect(),
      counters: await ctx.db.query('usageCounters').collect(),
    }))
    expect(left.users.map((u) => u._id)).toEqual([otherId])
    expect(left.accounts).toHaveLength(1)
    expect(left.codes).toEqual([])
    expect(left.products).toEqual([])
    expect(left.scans).toEqual([])
    expect(left.verdicts).toEqual([])
    expect(left.counters).toHaveLength(1)
  })

  it('refuses to delete the demo account', async () => {
    const { t, me } = await setup(DEMO_EMAIL)
    await expect(me.mutation(api.account.deleteMyAccount, {})).rejects.toMatchObject({ data: { code: 'DEMO_ACCOUNT' } })
    expect(await t.run((ctx) => ctx.db.query('users').collect())).toHaveLength(1)
  })

  it('requires sign-in', async () => {
    const t = convexTest(schema, modules)
    await expect(t.mutation(api.account.deleteMyAccount, {})).rejects.toMatchObject({ data: { code: 'NOT_AUTHENTICATED' } })
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
