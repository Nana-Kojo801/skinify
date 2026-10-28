// Fake but realistic data for the demo account: 3 products and 7 weekly scans over ~6 weeks, generated
// relative to "now" so the verdicts never drift (a seed run at any time gives the same three verdicts).
// Deterministic (seeded random), so "reset demo" always restores exactly the same data.
import type { Verdict } from '../verdict/verdict-types'

const DAY = 86_400_000
const HOUR = 3_600_000

export interface DemoScan {
  createdAt: number
  scores: Record<string, number>
  noise: Record<string, number>
  qualityFlag: boolean
}

export interface DemoProduct {
  name: string
  targetConcern: string
  /** Start of the start day, ms since epoch. */
  startDate: number
  /** The verdict this product is meant to show; the seed fails if the engine disagrees. */
  expected: Verdict
}

/** Small seeded random generator (mulberry32) so the demo data never changes between runs. */
function seededRandom(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** Days before today (at 08:30) of each weekly scan, oldest first. */
const SCAN_DAYS_AGO = [42, 35, 28, 21, 14, 7, 1]

/** Index of the scan flagged as poor quality (a bad-light day), to show what a flagged scan looks like. */
const FLAGGED_SCAN = 3

// Per-scan score paths for the concerns the demo products target.
const ACNE = [57.5, 59, 61.5, 64, 67.5, 70, 72.5] // clearly improving
const MOISTURE = [41, 42, 42.5, 41, 43, 42, 42] // flat
const OILINESS = [45, 52, 38, 55, 41, 58, 44] // swings with the light and time of day
const RADIANCE = [58, 59, 60, 60, 61, 61, 62]

export function buildDemoData(now: number): { products: DemoProduct[]; scans: DemoScan[] } {
  const random = seededRandom(20261028)
  const jitter = (spread: number) => (random() * 2 - 1) * spread
  const startOfToday = Math.floor(now / DAY) * DAY

  const scans: DemoScan[] = SCAN_DAYS_AGO.map((daysAgo, i) => {
    const scores = {
      acne: round1(ACNE[i] + jitter(0.6)),
      redness: round1(87 + jitter(0.8)),
      pore: round1(44 + jitter(0.8)),
      texture: round1(56 + jitter(0.8)),
      oiliness: OILINESS[i],
      moisture: round1(MOISTURE[i] + jitter(0.6)),
      radiance: round1(RADIANCE[i] + jitter(0.5)),
      dark_circle_v2: round1(74 + jitter(0.8)),
    }
    // |photo1 - photo2| per concern: small, except oiliness whose two photos disagree a lot
    const noise = Object.fromEntries(
      Object.keys(scores).map((concern) => [
        concern,
        concern === 'oiliness' ? round1(17 + random() * 7) : round1(0.6 + random() * 1.8),
      ]),
    )
    return { createdAt: startOfToday - daysAgo * DAY + 8.5 * HOUR, scores, noise, qualityFlag: i === FLAGGED_SCAN }
  })

  const products: DemoProduct[] = [
    { name: 'Salicylic acid cleanser', targetConcern: 'acne', startDate: startOfToday - 35 * DAY, expected: 'WORKING' },
    { name: 'Hyaluronic acid moisturiser', targetConcern: 'moisture', startDate: startOfToday - 34 * DAY, expected: 'NO_VISIBLE_CHANGE' },
    { name: 'Oil-control clay mask', targetConcern: 'oiliness', startDate: startOfToday - 34 * DAY, expected: 'CANT_TELL' },
  ]

  return { products, scans }
}
