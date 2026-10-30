import { v } from 'convex/values'
import { internalMutation, query } from './_generated/server'
import { getUserId } from './helpers'
import { recomputeProductVerdict, recomputeUserVerdicts } from './verdictCompute'

/** The newest verdict for a product, or null if none yet / not the user's. */
export const latestForProduct = query({
  args: { productId: v.id('products') },
  handler: async (ctx, { productId }) => {
    const userId = await getUserId(ctx)
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
    const userId = await getUserId(ctx)
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

// ---- internal: keeping verdicts up to date (never call YouCam) ----

export const recompute = internalMutation({
  args: { productId: v.id('products') },
  handler: async (ctx, { productId }) => {
    const product = await ctx.db.get(productId)
    if (product) await recomputeProductVerdict(ctx, product)
  },
})

export const recomputeForUser = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    await recomputeUserVerdicts(ctx, userId)
  },
})

/** Daily cron: time passing can change a verdict (e.g. TOO_EARLY after 28 days) without a new scan. */
export const recomputeAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query('products').collect()
    for (const product of products) await recomputeProductVerdict(ctx, product)
  },
})
