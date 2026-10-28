import { describe, expect, it } from 'vitest'
import { computeVerdict } from '../convex/lib/verdict/compute-verdict'
import { VERDICT_CONFIG } from '../convex/lib/verdict/verdict-config'
import type { ScanInput } from '../convex/lib/verdict/verdict-types'

const DAY = 86_400_000
const T0 = Date.UTC(2026, 8, 1) // scans are placed relative to this
const day = (n: number) => T0 + n * DAY

/** Product starts on day 14: baseline scans on days 0 and 7, post scans from day 21 on. */
const START = day(14)

interface Point {
  day: number
  acne?: number
  redness?: number
  /** per-scan photo difference applied to every concern (default 1) */
  diff?: number
  poor?: boolean
}

function scan({ day: d, acne, redness, diff = 1, poor = false }: Point): ScanInput {
  const scores: Record<string, number> = {}
  const noise: Record<string, number> = {}
  if (acne !== undefined) (scores.acne = acne), (noise.acne = diff)
  if (redness !== undefined) (scores.redness = redness), (noise.redness = diff)
  return { createdAt: day(d), scores, noise, qualityFlag: poor }
}

/** Weekly scans: 2 baseline (days 0, 7) then post scans on days 21, 28, 35, 42, 49. */
function series(
  acne: number[],
  redness: number[] = [60, 60, 60, 60, 60, 60, 60],
  extra: Partial<Point> = {},
): ScanInput[] {
  const days = [0, 7, 21, 28, 35, 42, 49]
  return acne.map((a, i) => scan({ day: days[i], acne: a, redness: redness[i], ...extra }))
}

const verdictOf = (scans: ScanInput[], now = day(14 + 40), targetConcern = 'acne') =>
  computeVerdict({ scans, startDate: START, targetConcern, now })

describe('WORKING', () => {
  it('target concern improves by more than 2x noise', () => {
    // baseline mean 51, last 2 post mean 71 -> change +20, noise ~1.41 (threshold ~2.83)
    const r = verdictOf(series([50, 52, 55, 60, 66, 70, 72]))
    expect(r.verdict).toBe('WORKING')
    expect(r.inputs.change).toBe(20)
    expect(r.inputs.improvement).toBe(20)
    expect(r.reasons).toEqual([])
  })

  it('respects a "lower is better" direction override', () => {
    const config = { ...VERDICT_CONFIG, improvementDirection: { acne: 'lower' as const } }
    const scans = series([70, 72, 65, 60, 55, 52, 50]) // score falls by 20 = improvement
    const r = computeVerdict({ scans, startDate: START, targetConcern: 'acne', now: day(54) }, config)
    expect(r.verdict).toBe('WORKING')
    expect(r.inputs.change).toBe(-20)
    expect(r.inputs.improvement).toBe(20)
  })
})

describe('NO_VISIBLE_CHANGE', () => {
  it('change is within 2x noise', () => {
    const r = verdictOf(series([50, 52, 51, 50, 52, 51, 53]))
    expect(r.verdict).toBe('NO_VISIBLE_CHANGE')
    expect(Math.abs(r.inputs.change!)).toBeLessThanOrEqual(r.inputs.noiseThreshold)
  })

  it('a change of exactly 2x noise is still within noise (strictly greater is needed)', () => {
    // baseline [50, 50] -> sd 0, photo diff 1 -> noise 1, threshold 2. Last 2 post mean = 52 -> change +2.
    const scans = series([50, 50, 50, 50, 50, 52, 52])
    expect(verdictOf(scans).verdict).toBe('NO_VISIBLE_CHANGE')
    const justOver = series([50, 50, 50, 50, 50, 52.5, 52.5])
    expect(verdictOf(justOver).verdict).toBe('WORKING')
  })
})

describe('TOO_EARLY', () => {
  it('fewer than 28 days since start', () => {
    const r = verdictOf(series([50, 52, 55, 60, 66, 70, 72]), START + 20 * DAY)
    expect(r.verdict).toBe('TOO_EARLY')
    expect(r.inputs.daysSinceStart).toBe(20)
    expect(r.inputs.daysRemaining).toBe(8)
  })

  it('fewer than 3 post scans even after 28 days', () => {
    const r = verdictOf(series([50, 52, 55, 60]), START + 40 * DAY)
    expect(r.verdict).toBe('TOO_EARLY')
    expect(r.inputs.postCount).toBe(2)
    expect(r.inputs.postScansRemaining).toBe(1)
  })

  it('no scans at all does not throw', () => {
    const r = verdictOf([])
    expect(r.verdict).toBe('TOO_EARLY')
    expect(r.inputs.baselineMean).toBeNull()
    expect(r.inputs.change).toBeNull()
  })

  it('wins over irritation and cant-tell (spec order)', () => {
    const r = verdictOf(series([50, 52, 55, 60], [70, 70, 40, 40]), START + 20 * DAY)
    expect(r.verdict).toBe('TOO_EARLY')
  })
})

describe('CANT_TELL', () => {
  it('fewer than 2 baseline scans, with advice', () => {
    const scans = series([50, 52, 55, 60, 66, 70, 72]).slice(1) // drops the day-0 scan
    const r = verdictOf(scans)
    expect(r.verdict).toBe('CANT_TELL')
    expect(r.reasons).toEqual(['FEW_BASELINE_SCANS'])
    expect(r.rescanAdvice).toHaveLength(1)
    expect(r.rescanAdvice[0]).toMatch(/2 scans from before/)
  })

  it('noise is large relative to the score range', () => {
    // photo1 and photo2 differ by 20 points on every scan: noise 20 / 99 = 0.2 > 0.15
    const r = verdictOf(series([50, 52, 55, 60, 66, 70, 72], undefined, { diff: 20 }))
    expect(r.verdict).toBe('CANT_TELL')
    expect(r.reasons).toEqual(['NOISY_SCANS'])
    expect(r.rescanAdvice[0]).toMatch(/window/)
  })

  it('latest scans flagged as poor quality', () => {
    const scans = series([50, 52, 55, 60, 66, 70, 72])
    scans[6] = { ...scans[6], qualityFlag: true }
    const r = verdictOf(scans)
    expect(r.verdict).toBe('CANT_TELL')
    expect(r.reasons).toEqual(['POOR_QUALITY'])
    expect(r.inputs.flaggedPoorQuality).toBe(true)
  })

  it('an old poor-quality scan does not block the verdict', () => {
    const scans = series([50, 52, 55, 60, 66, 70, 72])
    scans[2] = { ...scans[2], qualityFlag: true } // day 21, not in the last 2
    expect(verdictOf(scans).verdict).toBe('WORKING')
  })

  it('reports every reason at once', () => {
    const scans = series([50, 52, 55, 60, 66, 70, 72], undefined, { diff: 20, poor: true }).slice(1)
    const r = verdictOf(scans)
    expect(r.reasons).toEqual(['FEW_BASELINE_SCANS', 'NOISY_SCANS', 'POOR_QUALITY'])
    expect(r.rescanAdvice).toHaveLength(3)
  })

  it('wins over irritation', () => {
    const scans = series([50, 52, 55, 60, 66, 70, 72], [70, 70, 60, 55, 50, 45, 40])
    scans[6] = { ...scans[6], qualityFlag: true }
    expect(verdictOf(scans).verdict).toBe('CANT_TELL')
  })
})

describe('POSSIBLE_IRRITATION', () => {
  it('redness worse than baseline by more than 2x noise', () => {
    // acne improves, but redness score falls from 70 to 45 (higher = healthier)
    const r = verdictOf(series([50, 52, 55, 60, 66, 70, 72], [70, 70, 66, 60, 55, 50, 45]))
    expect(r.verdict).toBe('POSSIBLE_IRRITATION')
    expect(r.inputs.worsening).toEqual({ concern: 'redness', amount: 25, threshold: 2 })
  })

  it('counts a dip at ANY point after the start, even if it later recovers', () => {
    const r = verdictOf(series([50, 52, 55, 60, 66, 70, 72], [70, 70, 70, 45, 70, 70, 70]))
    expect(r.verdict).toBe('POSSIBLE_IRRITATION')
    expect(r.inputs.worsening?.amount).toBe(25)
  })

  it('does not fire when redness gets better', () => {
    const r = verdictOf(series([50, 52, 55, 60, 66, 70, 72], [60, 60, 62, 65, 70, 72, 75]))
    expect(r.verdict).toBe('WORKING')
    expect(r.inputs.worsening).toBeNull()
  })

  it('does not fire when redness moves within noise', () => {
    const r = verdictOf(series([50, 52, 55, 60, 66, 70, 72], [60, 60, 59, 61, 60, 59, 61]))
    expect(r.verdict).toBe('WORKING')
  })

  it('target concern clearly getting worse is never WORKING', () => {
    const r = verdictOf(series([60, 60, 55, 50, 45, 40, 38]))
    expect(r.verdict).toBe('POSSIBLE_IRRITATION')
    expect(r.inputs.worsening?.concern).toBe('acne')
    expect(r.inputs.improvement).toBeLessThan(0)
  })
})

describe('edge cases', () => {
  it('a scan on the start day counts as baseline', () => {
    const scans = [
      scan({ day: 0, acne: 50, redness: 60 }),
      scan({ day: 14, acne: 52, redness: 60 }), // start day -> baseline
      ...series([0, 0, 55, 60, 66, 70, 72]).slice(2), // 5 post scans
    ]
    const r = verdictOf(scans)
    expect(r.inputs.baselineCount).toBe(2)
    expect(r.inputs.postCount).toBe(5)
  })

  it('scans without the target concern are ignored for that concern', () => {
    const scans = series([50, 52, 55, 60, 66, 70, 72])
    scans.push(scan({ day: 56, redness: 60 })) // no acne score
    const r = verdictOf(scans, day(14 + 45))
    expect(r.inputs.postCount).toBe(5)
    expect(r.verdict).toBe('WORKING')
  })

  it('does not depend on the order of the input scans', () => {
    const scans = series([50, 52, 55, 60, 66, 70, 72])
    expect(verdictOf([...scans].reverse())).toEqual(verdictOf(scans))
  })

  it('does not mutate its input', () => {
    const scans = series([50, 52, 55, 60, 66, 70, 72])
    const copy = JSON.parse(JSON.stringify(scans))
    verdictOf([...scans].reverse())
    expect(scans).toEqual(copy)
  })

  it('noise floor stops zero-noise data from making tiny changes significant', () => {
    const scans = series([50, 50, 50, 50, 50, 50.5, 50.5], undefined, { diff: 0 })
    expect(verdictOf(scans).verdict).toBe('NO_VISIBLE_CHANGE')
  })

  it('inputs contain only plain numbers, booleans, strings or null (safe to store and send to the LLM)', () => {
    const r = verdictOf(series([50, 52, 55, 60, 66, 70, 72], [70, 70, 66, 60, 55, 50, 45]))
    const check = (v: unknown) => {
      if (v !== null && typeof v === 'object') Object.values(v).forEach(check)
      else expect(['number', 'boolean', 'string']).toContain(v === null ? 'string' : typeof v)
    }
    check(r.inputs)
    expect(JSON.stringify(r.inputs)).not.toContain('undefined')
  })
})
