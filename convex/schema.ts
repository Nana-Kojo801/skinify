import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { verdictInputsValidator, verdictValidator } from './validators'

// Convex requires a default export here.
export default defineSchema({
  ...authTables,

  products: defineTable({
    userId: v.id('users'),
    name: v.string(),
    /** One of the keys in shared/concerns.ts. */
    targetConcern: v.string(),
    /** Start of the start day, ms since epoch. Scans taken on this day count as baseline. */
    startDate: v.number(),
    endDate: v.optional(v.number()),
  }).index('by_user', ['userId']),

  // Scores only. Photos are never stored.
  scans: defineTable({
    userId: v.id('users'),
    /** ms since epoch */
    createdAt: v.number(),
    /** concern -> average raw_score of the 2 photos (higher = healthier) */
    scores: v.record(v.string(), v.number()),
    /** concern -> |photo1 - photo2| (noise estimate) */
    noise: v.record(v.string(), v.number()),
    /** true = the two photos disagreed broadly, treat the scan as poor quality */
    qualityFlag: v.boolean(),
  }).index('by_user_and_createdAt', ['userId', 'createdAt']),

  verdicts: defineTable({
    productId: v.id('products'),
    // Not in the original spec: lets us list/wipe a user's verdicts without joining through products.
    userId: v.id('users'),
    createdAt: v.number(),
    verdict: verdictValidator,
    /** Explanation text (templated first, replaced by the LLM text when it arrives). */
    summary: v.string(),
    /** The numbers the verdict was computed from (shared/verdict VerdictInputs). */
    inputs: verdictInputsValidator,
  })
    .index('by_product_and_createdAt', ['productId', 'createdAt'])
    .index('by_user', ['userId']),

  // Small named counters, e.g. total YouCam units the app has spent.
  usageCounters: defineTable({
    name: v.string(),
    value: v.number(),
  }).index('by_name', ['name']),
})
