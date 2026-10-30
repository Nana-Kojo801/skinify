import { describe, expect, it } from 'vitest'
import { CONCERN_KEYS } from '../shared/concerns'
import { buildOverview, OVERVIEW_CONFIG, signed, type OverviewScan } from '../shared/overview/overview'
import { combineOverall } from '../shared/scan/combine-scores'

const flat = (value: number) => Object.fromEntries(CONCERN_KEYS.map((key) => [key, value]))
const scan = (createdAt: number, scores: Record<string, number>, extra: Partial<OverviewScan> = {}): OverviewScan => ({ createdAt, scores, qualityFlag: false, ...extra })

describe('buildOverview', () => {
  it('needs at least two good scans', () => {
    expect(buildOverview([])).toBeNull()
    expect(buildOverview([scan(1, flat(50))])).toBeNull()
    expect(buildOverview([scan(1, flat(50)), scan(2, flat(60), { qualityFlag: true })])).toBeNull()
  })

  it('compares the first with the latest good scan, in any input order, and skips flagged scans', () => {
    const o = buildOverview([
      scan(30, { ...flat(50), acne: 72 }),
      scan(10, { ...flat(50), acne: 57 }),
      scan(5, { ...flat(10), acne: 1 }, { qualityFlag: true }), // earlier but unreliable: ignored
      scan(40, { ...flat(99), acne: 99 }, { qualityFlag: true }), // later but unreliable: ignored
    ])!
    expect(o.firstAt).toBe(10)
    expect(o.latestAt).toBe(30)
    expect(o.rows.find((r) => r.key === 'acne')).toMatchObject({ before: 57, now: 72, delta: 15 })
  })

  it('lists the biggest moves first, names at most four, and counts the rest as unchanged', () => {
    const before = { acne: 50, redness: 50, pore: 50, texture: 50, oiliness: 50, moisture: 50, radiance: 50, dark_circle_v2: 50 }
    const after = { ...before, acne: 65, radiance: 54, redness: 49, moisture: 40, pore: 50.4, texture: 51 }
    const o = buildOverview([scan(1, before), scan(2, after)])!
    // Biggest first. Redness (-1) and texture (+1) tie, so the concern order decides: redness takes the fourth place.
    expect(o.moved.map((r) => [r.key, r.delta])).toEqual([
      ['acne', 15],
      ['moisture', -10],
      ['radiance', 4],
      ['redness', -1],
    ])
    expect(o.moved).toHaveLength(OVERVIEW_CONFIG.maxMoved)
    expect(o.stillCount).toBe(o.rows.length - o.moved.length)
  })

  it('treats changes under one rounded point as no move', () => {
    const o = buildOverview([scan(1, flat(50)), scan(2, flat(50.4))])!
    expect(o.moved).toEqual([])
    expect(o.stillCount).toBe(CONCERN_KEYS.length)
  })

  it('ignores concerns missing from either scan and unknown keys', () => {
    const o = buildOverview([scan(1, { acne: 50, nonsense: 5 }), scan(2, { acne: 60, pore: 40 })])!
    expect(o.rows.map((r) => r.key)).toEqual(['acne'])
    expect(buildOverview([scan(1, { acne: 50 }), scan(2, { pore: 40 })])).toBeNull()
  })

  it('reports the overall score and how it moved only when both scans have one', () => {
    expect(buildOverview([scan(1, flat(50), { overall: 79.4 }), scan(2, flat(50), { overall: 82.2 })])!.overall).toEqual({ now: 82, delta: 3 })
    expect(buildOverview([scan(1, flat(50)), scan(2, flat(50), { overall: 82 })])!.overall).toEqual({ now: 82, delta: null })
    expect(buildOverview([scan(1, flat(50), { overall: 80 }), scan(2, flat(50))])!.overall).toBeNull()
    expect(buildOverview([scan(1, flat(50), { overall: 80 }), scan(2, flat(50), { overall: null })])!.overall).toBeNull()
  })
})

describe('wording and overall helpers', () => {
  it('signs deltas', () => {
    expect([signed(15), signed(-3), signed(0)]).toEqual(['+15', '-3', '0'])
  })
  it('combines the two photos overall scores only when both exist', () => {
    expect(combineOverall(80, 83)).toBe(81.5)
    expect(combineOverall(80, null)).toBeNull()
    expect(combineOverall(null, null)).toBeNull()
    expect(combineOverall(Number.NaN, 80)).toBeNull()
  })
})
