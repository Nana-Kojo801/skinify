import { query } from './_generated/server'
import { getUserId } from './helpers'

/**
 * The first time any of the user's products reached WORKING, from the verdict history (every recompute adds a row,
 * so history is kept until a product is deleted). Null if it never did. For the milestones on Home.
 */
export const firstWorking = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (userId === null) return null
    let earliest: { createdAt: number; productId: string } | null = null
    for (const verdict of await ctx.db.query('verdicts').withIndex('by_user', (q) => q.eq('userId', userId)).collect()) {
      if (verdict.verdict === 'WORKING' && (earliest === null || verdict.createdAt < earliest.createdAt)) {
        earliest = { createdAt: verdict.createdAt, productId: verdict.productId }
      }
    }
    if (earliest === null) return null
    const product = await ctx.db.get(earliest.productId as never)
    return { createdAt: earliest.createdAt, productName: (product as { name?: string } | null)?.name ?? null }
  },
})
