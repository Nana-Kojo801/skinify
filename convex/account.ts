import { ConvexError } from 'convex/values'
import { deleteClerkUser } from '../shared/clerk/clerk-api'
import { internal } from './_generated/api'
import { action, internalMutation, query } from './_generated/server'
import { getUserId, isDemoUser, rejectDemoUser, requireClerkSecretKey, requireUserId, wipeUserData } from './helpers'

/** For the Settings page: the demo account can't be deleted, so the button is hidden for it. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (userId === null) return null
    const user = await ctx.db.get(userId)
    return { email: user?.email ?? null, isDemoAccount: await isDemoUser(ctx, userId) }
  },
})

/** Step 1 of account deletion: wipes the caller's data and user row. Returns the Clerk user id to remove. */
export const wipeMyData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx)
    await rejectDemoUser(ctx, userId)
    const user = await ctx.db.get(userId)
    await wipeUserData(ctx, userId)
    return user?.clerkId ?? null
  },
})

/**
 * Wipes everything that belongs to the signed-in user (products, scans, verdicts, the user row) and then deletes
 * their Clerk login, so no personal data is left anywhere. `usageCounters` is app-wide and is NOT touched. The
 * client signs out right after.
 */
export const deleteMyAccount = action({
  args: {},
  handler: async (ctx) => {
    // Check the key first: don't wipe the data and then fail to remove the login.
    const secretKey = requireClerkSecretKey()
    const clerkId = await ctx.runMutation(internal.account.wipeMyData, {})
    if (clerkId === null) {
      throw new ConvexError({ code: 'NOT_AUTHENTICATED', message: 'Please sign in.' })
    }
    await deleteClerkUser(secretKey, clerkId)
  },
})
