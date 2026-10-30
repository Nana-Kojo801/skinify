import { ConvexError, v } from 'convex/values'
import { getClerkProfile } from '../shared/clerk/clerk-api'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { action, internalMutation, internalQuery } from './_generated/server'
import { getUserId } from './helpers'

/**
 * Called by the app right after Clerk signs someone in: makes sure their `users` row exists and has their email
 * and name. Clerk's token for Convex carries neither, so the first time (or when the email is still missing) the
 * server reads the verified email from Clerk's Backend API. If Clerk can't be reached the row is still created, so
 * signing in never depends on it, and the next visit fills the email in. Safe to call again and again.
 */
export const store = action({
  args: {},
  handler: async (ctx): Promise<Id<'users'>> => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) throw new ConvexError({ code: 'NOT_AUTHENTICATED', message: 'Please sign in.' })

    const existing = await ctx.runQuery(internal.users.byClerkId, { clerkId: identity.subject })
    if (existing?.email) return existing._id

    const secretKey = process.env.CLERK_SECRET_KEY
    const profile = secretKey ? await getClerkProfile(secretKey, identity.subject).catch(() => null) : null
    return await ctx.runMutation(internal.users.upsert, {
      clerkId: identity.subject,
      email: profile?.email ?? identity.email ?? undefined,
      name: profile?.name ?? identity.name ?? undefined,
    })
  },
})

export const byClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => await ctx.db.query('users').withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId)).unique(),
})

/** Creates the row, or fills in email and name that are new or changed. Never blanks a value it already has. */
export const upsert = internalMutation({
  args: { clerkId: v.string(), email: v.optional(v.string()), name: v.optional(v.string()) },
  handler: async (ctx, { clerkId, email, name }) => {
    const existing = await ctx.db.query('users').withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId)).unique()
    if (existing) {
      if ((email && existing.email !== email) || (name && existing.name !== name)) {
        await ctx.db.patch(existing._id, { email: email ?? existing.email, name: name ?? existing.name })
      }
      return existing._id
    }
    return await ctx.db.insert('users', { clerkId, email, name })
  },
})

/** For actions, which can't read the database: runs with the caller's identity. */
export const currentUserId = internalQuery({
  args: {},
  handler: async (ctx) => await getUserId(ctx),
})
