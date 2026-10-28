import { getAuthUserId } from '@convex-dev/auth/server'
import { mutation, query } from './_generated/server'
import { isDemoUser, rejectDemoUser, requireUserId } from './helpers'

/** For the Settings page: the demo account can't be deleted, so the button is hidden for it. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return null
    const user = await ctx.db.get(userId)
    return { email: user?.email ?? null, isDemoAccount: await isDemoUser(ctx, userId) }
  },
})

/**
 * Wipes everything that belongs to the signed-in user: products, scans, verdicts, sessions, login
 * accounts and the user row. `usageCounters` is app-wide and is NOT touched. The client signs out
 * right after (the session is already gone, so that call just clears the local token).
 */
export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    await rejectDemoUser(ctx, userId)

    for (const verdict of await ctx.db.query('verdicts').withIndex('by_user', (q) => q.eq('userId', userId)).collect()) {
      await ctx.db.delete(verdict._id)
    }
    for (const product of await ctx.db.query('products').withIndex('by_user', (q) => q.eq('userId', userId)).collect()) {
      await ctx.db.delete(product._id)
    }
    for (const scan of await ctx.db
      .query('scans')
      .withIndex('by_user_and_createdAt', (q) => q.eq('userId', userId))
      .collect()) {
      await ctx.db.delete(scan._id)
    }

    // Convex Auth tables.
    for (const session of await ctx.db.query('authSessions').withIndex('userId', (q) => q.eq('userId', userId)).collect()) {
      for (const token of await ctx.db
        .query('authRefreshTokens')
        .withIndex('sessionId', (q) => q.eq('sessionId', session._id))
        .collect()) {
        await ctx.db.delete(token._id)
      }
      await ctx.db.delete(session._id)
    }
    for (const account of await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
      .collect()) {
      for (const code of await ctx.db
        .query('authVerificationCodes')
        .withIndex('accountId', (q) => q.eq('accountId', account._id))
        .collect()) {
        await ctx.db.delete(code._id)
      }
      await ctx.db.delete(account._id)
    }

    await ctx.db.delete(userId)
  },
})
