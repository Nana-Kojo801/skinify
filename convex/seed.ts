import { createAccount } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { DEMO_EMAIL, DEMO_PASSWORD } from '../shared/demo-account'
import { buildDemoData } from '../shared/demo/demo-data'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { internalAction, internalMutation, internalQuery } from './_generated/server'
import { recomputeProductVerdict } from './verdictCompute'

export const findDemoUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.query('users').withIndex('email', (q) => q.eq('email', DEMO_EMAIL)).unique()
    return user?._id ?? null
  },
})

/**
 * Replaces everything the user has (products, scans, verdicts) with the demo data, then checks that the
 * verdict engine gives each product its intended verdict. Safe to run again and again. Touches nothing else
 * (not the auth tables, not other users, not the usage counters).
 */
export const seedDemoData = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    for (const verdict of await ctx.db.query('verdicts').withIndex('by_user', (q) => q.eq('userId', userId)).collect()) {
      await ctx.db.delete(verdict._id)
    }
    for (const product of await ctx.db.query('products').withIndex('by_user', (q) => q.eq('userId', userId)).collect()) {
      await ctx.db.delete(product._id)
    }
    for (const scan of await ctx.db.query('scans').withIndex('by_user_and_createdAt', (q) => q.eq('userId', userId)).collect()) {
      await ctx.db.delete(scan._id)
    }

    const demo = buildDemoData(Date.now())
    for (const scan of demo.scans) await ctx.db.insert('scans', { userId, ...scan })
    const scans = await ctx.db.query('scans').withIndex('by_user_and_createdAt', (q) => q.eq('userId', userId)).collect()

    const results: { name: string; verdict: string }[] = []
    for (const { expected, ...fields } of demo.products) {
      const productId = await ctx.db.insert('products', { userId, ...fields })
      // No LLM call: the demo must work without OpenRouter, the templated text is enough.
      await recomputeProductVerdict(ctx, (await ctx.db.get(productId))!, scans, { scheduleExplanation: false })
      const verdict = await ctx.db
        .query('verdicts')
        .withIndex('by_product_and_createdAt', (q) => q.eq('productId', productId))
        .order('desc')
        .first()
      if (verdict?.verdict !== expected) {
        throw new Error(`Demo seed: "${fields.name}" should be ${expected} but the engine says ${verdict?.verdict}. Check shared/demo/demo-data.ts against the verdict config.`)
      }
      results.push({ name: fields.name, verdict: expected })
    }
    return { scans: scans.length, products: results }
  },
})

/**
 * Creates the demo account if it doesn't exist yet and (re)seeds it. Run with `npm run reset-demo`
 * (add `-- --prod` for production). Needs Convex Auth (convex/auth.ts) to create the login.
 */
export const resetDemo = internalAction({
  args: {},
  handler: async (ctx): Promise<{ userId: Id<'users'>; created: boolean; scans: number; products: { name: string; verdict: string }[] }> => {
    let userId = await ctx.runQuery(internal.seed.findDemoUser, {})
    const created = userId === null
    if (userId === null) {
      try {
        const { user } = await createAccount(ctx, {
          provider: 'password',
          account: { id: DEMO_EMAIL, secret: DEMO_PASSWORD },
          profile: { email: DEMO_EMAIL },
        })
        userId = user._id
      } catch (error) {
        throw new Error(`Could not create the demo account (is Convex Auth set up in convex/auth.ts?): ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    const seeded = await ctx.runMutation(internal.seed.seedDemoData, { userId })
    return { userId, created, ...seeded }
  },
})
