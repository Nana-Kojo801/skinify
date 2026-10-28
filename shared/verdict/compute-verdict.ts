// Pure verdict engine: no Convex imports, no I/O, no Date.now(). Runs on server and client.
// Thresholds come from verdict-config.ts. Definitions follow docs/SPEC.md (Milestone 5).
//
// Decisions the spec left open (all easy to change here):
// - Evaluation order is the spec's: TOO_EARLY, CANT_TELL, POSSIBLE_IRRITATION, WORKING, NO_VISIBLE_CHANGE.
//   So irritation is NOT reported during the first 28 days / before 3 post scans.
// - A scan taken on the product's start day counts as baseline (it is the "before" scan).
// - noise = max(stddev of baseline scores, average photo difference over baseline + post scans, noiseFloor).
// - If the target concern gets worse by more than the noise threshold, the verdict is POSSIBLE_IRRITATION
//   (the spec has no "worse" verdict; calling it NO_VISIBLE_CHANGE would be wrong).
import { VERDICT_CONFIG, type Direction, type VerdictConfig } from './verdict-config'
import { mean, round2, sampleStdDev } from './stats'
import type {
  CantTellReason,
  ScanInput,
  VerdictInput,
  VerdictInputs,
  VerdictResult,
} from './verdict-types'

const DAY_MS = 86_400_000

const RESCAN_ADVICE: Record<CantTellReason, string> = {
  FEW_BASELINE_SCANS:
    'We need at least 2 scans from before you started this product. If you have not started it yet, move the start date forward and scan twice before the first use.',
  NOISY_SCANS:
    'Your two photos per scan disagree too much. Rescan in the same spot each time: face a window, even light, no filters, same distance and angle.',
  POOR_QUALITY:
    'Your latest scan was flagged as poor quality. Rescan in even daylight with your face centred and filling the frame, no filters or heavy makeup.',
}

export function computeVerdict(
  input: VerdictInput,
  config: VerdictConfig = VERDICT_CONFIG,
): VerdictResult {
  const { targetConcern, startDate, now } = input
  const scans = [...input.scans].sort((a, b) => a.createdAt - b.createdAt)
  const baselineEnd = startDate + DAY_MS // exclusive: the start day itself is still baseline

  const directionOf = (concern: string): Direction =>
    config.improvementDirection[concern] ?? config.defaultDirection

  /** Scans that have a score for `concern`, split into before / after the start. */
  const splitFor = (concern: string) => {
    const withScore = scans.filter((s) => Number.isFinite(s.scores[concern]))
    return {
      baseline: withScore.filter((s) => s.createdAt < baselineEnd),
      post: withScore.filter((s) => s.createdAt >= baselineEnd),
    }
  }

  const scoresOf = (list: ScanInput[], concern: string) => list.map((s) => s.scores[concern])

  /** max(stddev of baseline, average photo difference over all scans, floor) */
  const noiseFor = (concern: string, baseline: ScanInput[], post: ScanInput[]) => {
    const diffs = [...baseline, ...post]
      .map((s) => s.noise[concern])
      .filter((n) => Number.isFinite(n))
    return Math.max(sampleStdDev(scoresOf(baseline, concern)), mean(diffs) ?? 0, config.noiseFloor)
  }

  const direction = directionOf(targetConcern)
  const { baseline, post } = splitFor(targetConcern)
  const daysSinceStart = Math.max(0, Math.floor((now - startDate) / DAY_MS))

  const baselineMean = mean(scoresOf(baseline, targetConcern))
  const recentPostMean = mean(scoresOf(post.slice(-config.recentScanCount), targetConcern))
  const change = baselineMean !== null && recentPostMean !== null ? recentPostMean - baselineMean : null
  const improvement = change === null ? null : direction === 'higher' ? change : -change

  const noise = noiseFor(targetConcern, baseline, post)
  const noiseThreshold = config.noiseMultiplier * noise
  const noiseRatio = noise / (config.scoreRange.max - config.scoreRange.min)
  const flaggedPoorQuality = post.slice(-config.poorQualityLookback).some((s) => s.qualityFlag)

  const inputs: VerdictInputs = {
    targetConcern,
    direction,
    daysSinceStart,
    daysRemaining: Math.max(0, config.minDaysSinceStart - daysSinceStart),
    baselineCount: baseline.length,
    postCount: post.length,
    postScansRemaining: Math.max(0, config.minPostScans - post.length),
    baselineMean: baselineMean === null ? null : round2(baselineMean),
    recentPostMean: recentPostMean === null ? null : round2(recentPostMean),
    change: change === null ? null : round2(change),
    improvement: improvement === null ? null : round2(improvement),
    noise: round2(noise),
    noiseThreshold: round2(noiseThreshold),
    noiseRatio: round2(noiseRatio),
    flaggedPoorQuality,
    worsening: null,
  }

  const done = (verdict: VerdictResult['verdict'], reasons: CantTellReason[] = []): VerdictResult => ({
    verdict,
    reasons,
    rescanAdvice: reasons.map((r) => RESCAN_ADVICE[r]),
    inputs,
  })

  // 1. TOO_EARLY
  if (daysSinceStart < config.minDaysSinceStart || post.length < config.minPostScans) {
    return done('TOO_EARLY')
  }

  // 2. CANT_TELL
  const reasons: CantTellReason[] = []
  if (baseline.length < config.minBaselineScans) reasons.push('FEW_BASELINE_SCANS')
  if (noiseRatio > config.maxNoiseToRangeRatio) reasons.push('NOISY_SCANS')
  if (flaggedPoorQuality) reasons.push('POOR_QUALITY')
  if (reasons.length > 0) return done('CANT_TELL', reasons)

  // 3. POSSIBLE_IRRITATION: an irritation concern (redness) worse than its baseline by more than
  //    noiseMultiplier * noise at ANY post-start scan, or the target concern clearly worse.
  const worsening = findWorsening()
  if (worsening) {
    inputs.worsening = worsening
    return done('POSSIBLE_IRRITATION')
  }

  // 4. WORKING / 5. NO_VISIBLE_CHANGE (improvement is not null here: baseline and post both exist)
  if (improvement !== null && improvement > noiseThreshold) return done('WORKING')
  return done('NO_VISIBLE_CHANGE')

  function findWorsening(): VerdictInputs['worsening'] {
    let worst: NonNullable<VerdictInputs['worsening']> | null = null
    for (const concern of config.irritationConcerns) {
      const { baseline: b, post: p } = splitFor(concern)
      if (b.length < config.minBaselineScans || p.length === 0) continue
      const base = mean(scoresOf(b, concern))!
      const sign = directionOf(concern) === 'higher' ? 1 : -1
      const threshold = config.noiseMultiplier * noiseFor(concern, b, p)
      const amount = Math.max(...scoresOf(p, concern).map((score) => sign * (base - score)))
      if (amount > threshold && (!worst || amount - threshold > worst.amount - worst.threshold)) {
        worst = { concern, amount: round2(amount), threshold: round2(threshold) }
      }
    }
    if (!worst && improvement !== null && improvement < -noiseThreshold) {
      worst = { concern: targetConcern, amount: round2(-improvement), threshold: round2(noiseThreshold) }
    }
    return worst
  }
}
