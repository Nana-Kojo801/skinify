import { v } from 'convex/values'

export const verdictValidator = v.union(
  v.literal('TOO_EARLY'),
  v.literal('CANT_TELL'),
  v.literal('POSSIBLE_IRRITATION'),
  v.literal('WORKING'),
  v.literal('NO_VISIBLE_CHANGE'),
)

const nullableNumber = v.union(v.number(), v.null())

/** Mirrors VerdictInputs in shared/verdict/verdict-types.ts. */
export const verdictInputsValidator = v.object({
  targetConcern: v.string(),
  direction: v.union(v.literal('higher'), v.literal('lower')),
  daysSinceStart: v.number(),
  daysRemaining: v.number(),
  baselineCount: v.number(),
  postCount: v.number(),
  postScansRemaining: v.number(),
  baselineMean: nullableNumber,
  recentPostMean: nullableNumber,
  change: nullableNumber,
  improvement: nullableNumber,
  noise: v.number(),
  noiseThreshold: v.number(),
  noiseRatio: v.number(),
  flaggedPoorQuality: v.boolean(),
  worsening: v.union(
    v.null(),
    v.object({ concern: v.string(), amount: v.number(), threshold: v.number() }),
  ),
})
