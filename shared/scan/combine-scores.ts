export type ScoreMap = Record<string, number>

export interface CombinedScores {
  /** concern -> average of the two photos */
  scores: ScoreMap
  /** concern -> |photo1 - photo2| (the noise estimate) */
  noise: ScoreMap
}

/** Averages two photos' scores and measures how much they disagree. Only concerns present in both count. */
export function combinePhotoScores(photo1: ScoreMap, photo2: ScoreMap): CombinedScores {
  const scores: ScoreMap = {}
  const noise: ScoreMap = {}
  for (const concern of Object.keys(photo1)) {
    const a = photo1[concern]
    const b = photo2[concern]
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue
    scores[concern] = (a + b) / 2
    noise[concern] = Math.abs(a - b)
  }
  return { scores, noise }
}

/** True when the photos disagree broadly (mean noise across concerns at or above the threshold). */
export function isPoorQuality(noise: ScoreMap, meanDiffThreshold: number): boolean {
  const values = Object.values(noise)
  if (values.length === 0) return true
  return values.reduce((sum, n) => sum + n, 0) / values.length >= meanDiffThreshold
}
