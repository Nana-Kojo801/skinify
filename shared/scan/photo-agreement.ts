// How closely the two photos of a scan agree, in plain words. Used on the scan result screen so people
// can see WHY we ask for two photos: the gap between them is the measure of how steady the scan is.
import { SCAN_CONFIG } from './scan-config'

export type AgreementLevel = 'great' | 'good' | 'uneven' | 'poor'

export interface Agreement {
  level: AgreementLevel
  /** Short label for a chip. */
  label: string
  /** One sentence for the person. */
  sentence: string
}

/** Average |photo 1 - photo 2| over all concerns (the same number that decides the poor-quality flag). */
export function meanGap(noise: Record<string, number>): number {
  const values = Object.values(noise)
  return values.length === 0 ? 0 : values.reduce((sum, n) => sum + n, 0) / values.length
}

/** Levels are fractions of the poor-quality threshold, so they move together with it. */
export function describeAgreement(gap: number, poorAt: number = SCAN_CONFIG.poorQualityMeanDiff): Agreement {
  if (gap >= poorAt) {
    return {
      level: 'poor',
      label: 'Quite uneven',
      sentence: 'The photos disagreed a lot, so this scan counts as lower quality. Next time use the same window light and distance for both.',
    }
  }
  if (gap >= poorAt * 0.5) {
    return {
      level: 'uneven',
      label: 'A little uneven',
      sentence: 'Small differences between the photos. Same window light and distance for both will tighten it up.',
    }
  }
  if (gap >= poorAt * 0.25) {
    return { level: 'good', label: 'Steady', sentence: 'Only a small difference between the two photos, so changes you see over time can be trusted.' }
  }
  return { level: 'great', label: 'Very steady', sentence: 'Light and angle barely moved your numbers, so changes you see over time can be trusted.' }
}
