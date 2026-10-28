// Shared logic for computing and storing verdicts. Not a Convex function module itself:
// the functions that use it are in verdicts.ts, scans.ts and products.ts.
import { computeVerdict } from '../shared/verdict/compute-verdict'
import { verdictSignature } from '../shared/verdict/verdict-signature'
import { fallbackSummary } from '../shared/verdict/verdict-templates'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'

/**
 * Runs the verdict engine for one product and stores a new verdict row when the verdict or the data behind
 * it changed (otherwise does nothing). Returns the new row's id, or null when nothing changed.
 * Never calls YouCam. New rows get the templated summary at once; the LLM explanation is scheduled after.
 */
export async function recomputeProductVerdict(
  ctx: MutationCtx,
  product: Doc<'products'>,
  scans?: Doc<'scans'>[],
  options: { scheduleExplanation?: boolean } = {},
): Promise<Id<'verdicts'> | null> {
  const now = Date.now()
  const userScans =
    scans ??
    (await ctx.db
      .query('scans')
      .withIndex('by_user_and_createdAt', (q) => q.eq('userId', product.userId))
      .collect())

  const result = computeVerdict({
    scans: userScans,
    startDate: product.startDate,
    targetConcern: product.targetConcern,
    now,
  })

  const latest = await ctx.db
    .query('verdicts')
    .withIndex('by_product_and_createdAt', (q) => q.eq('productId', product._id))
    .order('desc')
    .first()
  if (latest && verdictSignature(latest) === verdictSignature(result)) return null

  const row = {
    verdict: result.verdict,
    inputs: result.inputs,
    reasons: result.reasons,
    rescanAdvice: result.rescanAdvice,
  }
  const verdictId = await ctx.db.insert('verdicts', {
    productId: product._id,
    userId: product.userId,
    createdAt: now,
    ...row,
    summary: fallbackSummary(row),
    summarySource: 'template',
  })
  // No key, no point scheduling: the templated summary stays.
  if (options.scheduleExplanation !== false && process.env.OPENROUTER_API_KEY) {
    await ctx.scheduler.runAfter(0, internal.explanations.generate, { verdictId })
  }
  return verdictId
}

/** Recomputes every product of one user (their scans are loaded once). */
export async function recomputeUserVerdicts(ctx: MutationCtx, userId: Id<'users'>): Promise<void> {
  const [products, scans] = await Promise.all([
    ctx.db.query('products').withIndex('by_user', (q) => q.eq('userId', userId)).collect(),
    ctx.db.query('scans').withIndex('by_user_and_createdAt', (q) => q.eq('userId', userId)).collect(),
  ])
  for (const product of products) await recomputeProductVerdict(ctx, product, scans)
}
