import { ConvexError } from 'convex/values'
import { createSignInTicket } from '../shared/clerk/clerk-api'
import { internal } from './_generated/api'
import { action } from './_generated/server'
import { requireClerkSecretKey } from './helpers'

/**
 * "Try the demo": a one-time Clerk sign-in ticket for the seeded demo user, which the browser redeems with
 * `signIn.ticket`. The demo account is public by design (read-only, seeded data), so no sign-in is needed to ask
 * for it. No password exists anywhere.
 */
export const ticket = action({
  args: {},
  handler: async (ctx): Promise<string> => {
    const secretKey = requireClerkSecretKey()
    const clerkId = await ctx.runQuery(internal.seed.findDemoClerkId, {})
    if (clerkId === null) {
      throw new ConvexError({ code: 'DEMO_UNAVAILABLE', message: 'The demo account is not available right now.' })
    }
    return await createSignInTicket(secretKey, clerkId)
  },
})
