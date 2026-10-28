import type { Direction } from './verdict-config'

export const VERDICTS = [
  'TOO_EARLY',
  'CANT_TELL',
  'POSSIBLE_IRRITATION',
  'WORKING',
  'NO_VISIBLE_CHANGE',
] as const

export type Verdict = (typeof VERDICTS)[number]

export type CantTellReason = 'FEW_BASELINE_SCANS' | 'NOISY_SCANS' | 'POOR_QUALITY'

/** The part of a stored scan the engine needs. Mirrors the `scans` table. */
export interface ScanInput {
  /** ms since epoch */
  createdAt: number
  /** concern -> averaged raw score */
  scores: Record<string, number>
  /** concern -> |photo1 - photo2| */
  noise: Record<string, number>
  /** true when the scan was flagged as poor quality */
  qualityFlag: boolean
}

export interface VerdictInput {
  /** All of the user's scans, any order. */
  scans: ScanInput[]
  /** Product start day as ms since epoch (start of that day). Scans on the start day count as baseline. */
  startDate: number
  targetConcern: string
  /** ms since epoch, passed in so the function stays pure. */
  now: number
}

/** The numbers behind a verdict. Plain numbers or null only, so it can be stored and sent to the LLM as is. */
export interface VerdictInputs {
  targetConcern: string
  direction: Direction
  daysSinceStart: number
  daysRemaining: number
  baselineCount: number
  postCount: number
  postScansRemaining: number
  baselineMean: number | null
  recentPostMean: number | null
  /** mean(last N post scans) - mean(baseline), positive = score went up */
  change: number | null
  /** change in the "improved" direction, positive = better */
  improvement: number | null
  noise: number
  /** noiseMultiplier * noise: how big a change has to be to count */
  noiseThreshold: number
  noiseRatio: number
  flaggedPoorQuality: boolean
  /** Set when the verdict is POSSIBLE_IRRITATION. */
  worsening: { concern: string; amount: number; threshold: number } | null
}

export interface VerdictResult {
  verdict: Verdict
  /** Why CANT_TELL (empty for other verdicts). */
  reasons: CantTellReason[]
  /** What a rescan / different action would fix (CANT_TELL only). */
  rescanAdvice: string[]
  inputs: VerdictInputs
}
