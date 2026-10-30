import { v } from 'convex/values'
import { createClerkUser, findClerkUserIdByEmail } from '../shared/clerk/clerk-api'
import { DEMO_EMAIL } from '../shared/demo-account'
import { buildDemoData } from '../shared/demo/demo-data'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { internalAction, internalMutation, internalQuery } from './_generated/server'
import { requireClerkSecretKey } from './helpers'
import { recomputeProductVerdict } from './verdictCompute'

export const findDemoUser = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.query('users').withIndex('email', (q) => q.eq('email', DEMO_EMAIL)).unique()
    return user?._id ?? null
  },
})

/** The demo user's Clerk id, for the "Try the demo" sign-in ticket. */
export const findDemoClerkId = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db.query('users').withIndex('email', (q) => q.eq('email', DEMO_EMAIL)).unique()
    return user?.clerkId ?? null
  },
})

/** Makes sure the demo `users` row exists and points at the demo's Clerk user. */
export const ensureDemoUser = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db.query('users').withIndex('email', (q) => q.eq('email', DEMO_EMAIL)).unique()
    if (user) {
      if (user.clerkId !== clerkId) await ctx.db.patch(user._id, { clerkId })
      return { userId: user._id, created: false }
    }
    return { userId: await ctx.db.insert('users', { email: DEMO_EMAIL, name: 'Demo', clerkId }), created: true }
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
 * Creates the demo account if it doesn't exist yet (a passwordless Clerk user plus our `users` row) and (re)seeds
 * it. Run with `npm run reset-demo` (add `-- --prod` for production). Needs CLERK_SECRET_KEY on the deployment.
 * The demo signs in through a one-time ticket (convex/demo.ts), so it has no password.
 */
export const resetDemo = internalAction({
  args: {},
  handler: async (ctx): Promise<{ userId: Id<'users'>; created: boolean; scans: number; products: { name: string; verdict: string }[] }> => {
    const secretKey = requireClerkSecretKey()
    const clerkId = (await findClerkUserIdByEmail(secretKey, DEMO_EMAIL)) ?? (await createClerkUser(secretKey, DEMO_EMAIL))
    const { userId, created } = await ctx.runMutation(internal.seed.ensureDemoUser, { clerkId })
    const seeded = await ctx.runMutation(internal.seed.seedDemoData, { userId })
    return { userId, created, ...seeded }
  },
})
