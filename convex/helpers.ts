import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError } from 'convex/values'
import { DEMO_EMAIL } from '../shared/demo-account'
import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

/** For mutations: the signed-in user, or a NOT_AUTHENTICATED error. */
export async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx)
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
