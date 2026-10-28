import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { isConcernKey } from '../shared/concerns'
import type { Id } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { invalidInput, rejectDemoUser, requireUserId } from './helpers'
import { recomputeProductVerdict } from './verdictCompute'

const MAX_NAME_LENGTH = 80
const DAY_MS = 86_400_000

function cleanName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) throw invalidInput('Give the product a name.')
  if (trimmed.length > MAX_NAME_LENGTH) throw invalidInput(`Product names can be at most ${MAX_NAME_LENGTH} characters.`)
  return trimmed
}

function checkConcern(concern: string): void {
  if (!isConcernKey(concern)) throw invalidInput('Choose one of the available skin concerns.')
}

/** The signed-in user's product, or null (missing, or someone else's). */
async function ownProduct(ctx: Parameters<typeof requireUserId>[0], productId: Id<'products'>) {
  const userId = await requireUserId(ctx)
  await rejectDemoUser(ctx, userId)
  const product = await ctx.db.get(productId)
  return product && product.userId === userId ? product : null
}

export const create = mutation({
  args: {
    name: v.string(),
    targetConcern: v.string(),
    /** Start of the start day, ms since epoch. Defaults to the start of today (UTC). */
    startDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx)
    await rejectDemoUser(ctx, userId)
    const name = cleanName(args.name)
    checkConcern(args.targetConcern)
    const startDate = args.startDate ?? Math.floor(Date.now() / DAY_MS) * DAY_MS
    const productId = await ctx.db.insert('products', { userId, name, targetConcern: args.targetConcern, startDate })
    // Gives the new product a verdict (TOO_EARLY or CANT_TELL) straight away, so Home has a badge to show.
    await recomputeProductVerdict(ctx, (await ctx.db.get(productId))!)
    return productId
  },
})

/** All of the user's products, newest first. Empty when signed out. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return []
    return await ctx.db.query('products').withIndex('by_user', (q) => q.eq('userId', userId)).order('desc').collect()
  },
})

/** One product, or null if it doesn't exist or isn't the user's. */
export const get = query({
  args: { productId: v.id('products') },
  handler: async (ctx, { productId }) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) return null
    const product = await ctx.db.get(productId)
    return product && product.userId === userId ? product : null
  },
})

export const update = mutation({
  args: {
    productId: v.id('products'),
    name: v.optional(v.string()),
    targetConcern: v.optional(v.string()),
    startDate: v.optional(v.number()),
    /** null clears the end date */
    endDate: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, { productId, name, targetConcern, startDate, endDate }) => {
    const product = await ownProduct(ctx, productId)
    if (!product) throw invalidInput('That product was not found.')
    if (targetConcern !== undefined) checkConcern(targetConcern)
    await ctx.db.patch(productId, {
      ...(name !== undefined && { name: cleanName(name) }),
      ...(targetConcern !== undefined && { targetConcern }),
      ...(startDate !== undefined && { startDate }),
      // patching a field with undefined removes it
      ...(endDate !== undefined && { endDate: endDate === null ? undefined : endDate }),
    })
    if (targetConcern !== undefined || startDate !== undefined) {
      await recomputeProductVerdict(ctx, (await ctx.db.get(productId))!)
    }
  },
})

/** Deletes the product and its verdicts. Scans belong to the user, not the product, so they stay. */
export const remove = mutation({
  args: { productId: v.id('products') },
  handler: async (ctx, { productId }) => {
    const product = await ownProduct(ctx, productId)
    if (!product) return
    const verdicts = await ctx.db
      .query('verdicts')
      .withIndex('by_product_and_createdAt', (q) => q.eq('productId', productId))
      .collect()
    for (const verdict of verdicts) await ctx.db.delete(verdict._id)
    await ctx.db.delete(productId)
  },
})
