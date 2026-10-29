import { internalQuery, mutation } from './_generated/server'
import { ConvexError } from 'convex/values'
import { getUserId } from './helpers'

/**
 * Called by the app right after Clerk signs someone in: creates their `users` row on the first visit and keeps
 * email and name current afterwards. Returns the row id. Safe to call again and again.
 */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) throw new ConvexError({ code: 'NOT_AUTHENTICATED', message: 'Please sign in.' })

    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
      .unique()
    if (existing) {
      if ((identity.email && existing.email !== identity.email) || (identity.name && existing.name !== identity.name)) {
        await ctx.db.patch(existing._id, { email: identity.email ?? existing.email, name: identity.name ?? existing.name })
      }
      return existing._id
    }
    return await ctx.db.insert('users', { clerkId: identity.subject, email: identity.email, name: identity.name })
  },
})

/** For actions, which can't read the database: runs with the caller's identity. */
export const currentUserId = internalQuery({
  args: {},
  handler: async (ctx) => await getUserId(ctx),
})
