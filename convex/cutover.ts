import { internalMutation } from './_generated/server'
import { wipeUserData } from './helpers'

/**
 * One-time cleanup for the move from Convex Auth to Clerk (issue #39). Deletes every user that has no Clerk id
 * (all accounts made with email + password, and the old demo user) together with their products, scans and
 * verdicts, then empties the old Convex Auth tables. Users who signed in with Clerk are left alone, so it is safe
 * to run twice. Afterwards run `npm run reset-demo`, then remove the legacy tables from convex/schema.ts.
 */
export const wipeLegacyAccounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    let users = 0
    for (const user of await ctx.db.query('users').collect()) {
      if (user.clerkId !== undefined) continue
      await wipeUserData(ctx, user._id)
      users++
    }
    let authDocs = 0
    for (const table of ['authAccounts', 'authSessions', 'authRefreshTokens', 'authVerificationCodes', 'authVerifiers', 'authRateLimits'] as const) {
      for (const doc of await ctx.db.query(table).collect()) {
        await ctx.db.delete(doc._id)
        authDocs++
      }
    }
    return { users, authDocs }
  },
})
