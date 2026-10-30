import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { verdictInputsValidator, verdictValidator } from './validators'

// Convex requires a default export here.
export default defineSchema({
  // One row per signed-in person, created the first time they open the app (users.store). Sign-in itself is
  // Clerk; `clerkId` is the Clerk user id (the token's `subject`). The email is the verified primary email,
  // read from Clerk's Backend API.
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    // Scan reminders (issue #40). Off unless reminderOptIn is true.
    reminderOptIn: v.optional(v.boolean()),
    /** IANA time zone from the browser, so the reminder arrives at 9:00 where the person is. */
    timeZone: v.optional(v.string()),
    /** Random secret in the unsubscribe link; no login needed to use it. */
    unsubscribeToken: v.optional(v.string()),
    /** The scan (createdAt) that remindersSent counts for: a newer scan starts the count again. */
    reminderScanAt: v.optional(v.number()),
    remindersSent: v.optional(v.number()),
    /** The due date we last emailed about, so each due date is emailed once. */
    lastReminderDue: v.optional(v.number()),
  })
    .index('by_clerk_id', ['clerkId'])
    .index('email', ['email'])
    .index('by_reminder_opt_in', ['reminderOptIn'])
    .index('by_unsubscribe_token', ['unsubscribeToken']),

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
    /** Average brightness of the two photos, 0 to 255, measured in the browser. One number, never a photo: it only
     *  lets the scan page say "lighting differs from your last scan". Absent on older and demo scans. */
    brightness: v.optional(v.number()),
  }).index('by_user_and_createdAt', ['userId', 'createdAt']),

  verdicts: defineTable({
    productId: v.id('products'),
    // Not in the original spec: lets us list/wipe a user's verdicts without joining through products.
    userId: v.id('users'),
    createdAt: v.number(),
    verdict: verdictValidator,
    /** Explanation text: templated first, replaced by the LLM text when it arrives and passes the checks. */
    summary: v.string(),
    summarySource: v.union(v.literal('template'), v.literal('model')),
    /** Why CANT_TELL (FEW_BASELINE_SCANS, NOISY_SCANS, POOR_QUALITY); empty for other verdicts. */
    reasons: v.array(v.string()),
    /** What a rescan would fix, one sentence per reason (CANT_TELL only). */
    rescanAdvice: v.array(v.string()),
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
