import { ConvexError } from 'convex/values'
import { DEMO_EMAIL } from '../shared/demo-account'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

/**
 * The signed-in user's row, or null when signed out or not stored yet. Clerk signs people in; their `users` row is
 * created by users.store the first time they open the app, so a brand-new session briefly has no row.
 */
export async function getUserId(ctx: QueryCtx | MutationCtx): Promise<Id<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (identity === null) return null
  const user = await ctx.db
    .query('users')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', identity.subject))
    .unique()
  return user?._id ?? null
}

/** For mutations: the signed-in user, or a NOT_AUTHENTICATED error. */
export async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<'users'>> {
  const userId = await getUserId(ctx)
  if (userId === null) {
    throw new ConvexError({ code: 'NOT_AUTHENTICATED', message: 'Please sign in.' })
  }
  return userId
}

export function invalidInput(message: string): ConvexError<{ code: 'INVALID_INPUT'; message: string }> {
  return new ConvexError({ code: 'INVALID_INPUT', message })
}

export async function isDemoUser(ctx: QueryCtx | MutationCtx, userId: Id<'users'>): Promise<boolean> {
  const user = await ctx.db.get(userId)
  return user?.email === DEMO_EMAIL
}

/**
 * The demo account is read-only: it has to look the same for every judge until Nov 20, so it can't add,
 * change or delete products (or scan, or delete itself: see scans.submit and account deletion).
 */
export async function rejectDemoUser(ctx: QueryCtx | MutationCtx, userId: Id<'users'>): Promise<void> {
  if (await isDemoUser(ctx, userId)) {
    throw new ConvexError({
      code: 'DEMO_ACCOUNT',
      message: 'The demo account is read-only. Create your own account to add or change products.',
    })
  }
}

/** The Clerk secret key, or a clear error. Server-side only (a Convex env var, never in the client or the repo). */
export function requireClerkSecretKey(): string {
  const key = process.env.CLERK_SECRET_KEY
  if (!key) {
    throw new ConvexError({ code: 'NOT_CONFIGURED', message: 'This service is not fully set up (CLERK_SECRET_KEY is missing).' })
  }
  return key
}

/**
 * Deletes everything that belongs to the user: verdicts, products, scans and the user row. `usageCounters` is
 * app-wide and is NOT touched.
 */
export async function wipeUserData(ctx: MutationCtx, userId: Id<'users'>): Promise<void> {
  for (const verdict of await ctx.db.query('verdicts').withIndex('by_user', (q) => q.eq('userId', userId)).collect()) {
    await ctx.db.delete(verdict._id)
  }
  for (const product of await ctx.db.query('products').withIndex('by_user', (q) => q.eq('userId', userId)).collect()) {
    await ctx.db.delete(product._id)
  }
  for (const scan of await ctx.db.query('scans').withIndex('by_user_and_createdAt', (q) => q.eq('userId', userId)).collect()) {
    await ctx.db.delete(scan._id)
  }
  await ctx.db.delete(userId)
}
