// Every tunable threshold for the verdict engine lives in this file.
// Scores are the YouCam `raw_score` (1-100, HIGHER = healthier), see docs/youcam-api-notes.md.

export type Direction = 'higher' | 'lower'

export interface VerdictConfig {
  /** TOO_EARLY: fewer than this many days since the start date... */
  minDaysSinceStart: number
  /** ...or fewer than this many scans after the start date. */
  minPostScans: number
  /** CANT_TELL: fewer than this many scans before the start date. */
  minBaselineScans: number
  /** `change` compares the mean of this many latest post scans with the baseline mean. */
  recentScanCount: number
  /** WORKING / NO_VISIBLE_CHANGE / POSSIBLE_IRRITATION compare against this many times the noise. */
  noiseMultiplier: number
  /** Noise never drops below this (points), so identical synthetic scans don't make every tiny change "real". */
  noiseFloor: number
  /** CANT_TELL: noise divided by the score range above this means the measurements are too jumpy. */
  maxNoiseToRangeRatio: number
  /** Typical score range, used to judge how large the noise is. */
  scoreRange: { min: number; max: number }
  /** CANT_TELL: any of this many latest post scans flagged as poor quality. */
  poorQualityLookback: number
  /** Which way is "improved" per concern. Concerns not listed use `defaultDirection`. */
  improvementDirection: Record<string, Direction>
  defaultDirection: Direction
  /** POSSIBLE_IRRITATION is checked on these concerns (redness, or the equivalent the API returns). */
  irritationConcerns: string[]
}

export const VERDICT_CONFIG: VerdictConfig = {
  minDaysSinceStart: 28,
  minPostScans: 3,
  minBaselineScans: 2,
  recentScanCount: 2,
  noiseMultiplier: 2,
  noiseFloor: 1,
  // 0.15 * 99 is about 15 points of noise, so a real change would have to exceed ~30 points to count.
  maxNoiseToRangeRatio: 0.15,
  scoreRange: { min: 1, max: 100 },
  poorQualityLookback: 2,
  // YouCam raw_score: higher = healthier for every concern, so a higher score is an improvement.
  // Override a concern here with 'lower' if the spike shows an inverted score.
  improvementDirection: {
    wrinkle: 'higher',
    droopy_upper_eyelid: 'higher',
    droopy_lower_eyelid: 'higher',
    firmness: 'higher',
    acne: 'higher',
    moisture: 'higher',
    eye_bag: 'higher',
    dark_circle_v2: 'higher',
    age_spot: 'higher',
    radiance: 'higher',
    redness: 'higher',
    oiliness: 'higher',
    pore: 'higher',
    texture: 'higher',
    tear_trough: 'higher',
  },
  defaultDirection: 'higher',
  irritationConcerns: ['redness'],
}
