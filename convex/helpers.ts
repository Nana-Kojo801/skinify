import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError } from 'convex/values'
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
