import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { query } from './_generated/server'

/** The newest verdict for a product, or null if none yet / not the user's. */
export const latestForProduct = query({
  args: { productId: v.id('products') },
  handler: async (ctx, { productId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return null
    const product = await ctx.db.get(productId)
    if (!product || product.userId !== userId) return null
    return await ctx.db
      .query('verdicts')
      .withIndex('by_product_and_createdAt', (q) => q.eq('productId', productId))
      .order('desc')
      .first()
  },
})

/** One entry per product of the user with its newest verdict (or null). Used by the Home page. */
export const latestForAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return []
    const products = await ctx.db.query('products').withIndex('by_user', (q) => q.eq('userId', userId)).collect()
    return await Promise.all(
      products.map(async (product) => ({
        productId: product._id,
        verdict: await ctx.db
          .query('verdicts')
          .withIndex('by_product_and_createdAt', (q) => q.eq('productId', product._id))
          .order('desc')
          .first(),
      })),
    )
  },
})
