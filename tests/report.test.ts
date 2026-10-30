import { describe, expect, it } from 'vitest'
import { CONCERN_KEYS } from '../shared/concerns'
import { DAY_MS } from '../shared/reminders/reminder-config'
import { buildReport, REPORT_DISCLAIMER, type ReportScan, type ReportVerdict } from '../shared/report/report-data'
import type { VerdictInputs } from '../shared/verdict/verdict-types'

const NOW = Date.UTC(2026, 9, 30, 12)
const inputs = (o: Partial<VerdictInputs> = {}): VerdictInputs => ({
  targetConcern: 'acne', direction: 'higher', daysSinceStart: 35, daysRemaining: 0, baselineCount: 2, postCount: 5, postScansRemaining: 0,
  baselineMean: 58.6, recentPostMean: 71.7, change: 13.1, improvement: 13.1, noise: 1.45, noiseThreshold: 2.9, noiseRatio: 0.02,
  flaggedPoorQuality: false, worsening: null, ...o,
})
const scan = (day: number, acne: number, flagged = false): ReportScan => ({
  createdAt: NOW - (40 - day) * DAY_MS,
  scores: Object.fromEntries(CONCERN_KEYS.map((k) => [k, k === 'acne' ? acne : 50])),
  qualityFlag: flagged,
})
const product = (id: string, name: string, concern: string, startDaysAgo: number) => ({ _id: id, name, targetConcern: concern, startDate: NOW - startDaysAgo * DAY_MS })
const verdicts = (entries: [string, ReportVerdict][]) => new Map(entries)

describe('buildReport: products', () => {
  it('describes a WORKING product with the facts, the score change and the variation', () => {
    const report = buildReport({ products: [product('a', 'Cleanser', 'acne', 35)], scans: [], verdicts: verdicts([['a', { verdict: 'WORKING', reasons: [], inputs: inputs() }]]), now: NOW })
    expect(report.products[0]).toMatchObject({
      name: 'Cleanser', concern: 'Acne', day: 35, active: true, verdictLabel: 'WORKING', scoreChange: '59 → 72 (+13.1)', variation: '±2.9',
    })
    expect(report.products[0].lines).toEqual(['5 scans since you started, 35 days tracked.', 'Your change is 4.5 times normal variation.'])
  })

  it('NO VISIBLE CHANGE and POSSIBLE IRRITATION carry their own facts', () => {
    const report = buildReport({
      products: [product('a', 'Moisturiser', 'moisture', 34), product('b', 'Toner', 'redness', 20)],
      scans: [],
      verdicts: verdicts([
        ['a', { verdict: 'NO_VISIBLE_CHANGE', reasons: [], inputs: inputs({ improvement: 0.3, change: 0.3, noiseThreshold: 2.9 }) }],
        ['b', { verdict: 'POSSIBLE_IRRITATION', reasons: [], inputs: inputs({ worsening: { concern: 'redness', amount: 9, threshold: 4 } }) }],
      ]),
      now: NOW,
    })
    const [moist, toner] = report.products
    expect(moist.verdictLabel).toBe('NO VISIBLE CHANGE')
    expect(moist.lines[1]).toBe('Your change is inside normal variation (±2.9).')
    expect(toner.verdictLabel).toBe('POSSIBLE IRRITATION')
    expect(toner.lines[1]).toBe('Your redness got worse by 2.3 times normal variation.')
  })

  it("CAN'T TELL lists the reasons in plain words, and TOO EARLY shows the progress and no comparison", () => {
    const report = buildReport({
      products: [product('a', 'Mask', 'oiliness', 34), product('b', 'New', 'pore', 5)],
      scans: [],
      verdicts: verdicts([
        ['a', { verdict: 'CANT_TELL', reasons: ['NOISY_SCANS', 'POOR_QUALITY'], inputs: inputs({ noise: 20.7 }) }],
        ['b', { verdict: 'TOO_EARLY', reasons: [], inputs: inputs({ postCount: 1 }) }],
      ]),
      now: NOW,
    })
    const [mask, fresh] = report.products
    expect(mask.verdictLabel).toBe("CAN'T TELL YET")
    expect(mask.lines).toEqual(['Photos of the same scan disagreed by about 20.7 points, too much to spot a real change.', 'A recent scan was marked as lower quality.'])
    expect(fresh).toMatchObject({ verdictLabel: 'TOO EARLY', scoreChange: null, variation: null, day: 5 })
    expect(fresh.lines[0]).toBe('1 scan of the 3 needed since the start, 5 days of 28.')
  })

  it('handles a product with no verdict, an ended product, an unknown concern and a future start', () => {
    const report = buildReport({
      products: [{ ...product('a', 'Old', 'acne', 60), endDate: NOW - DAY_MS }, product('b', 'Odd', 'something_else', 10), product('c', 'Soon', 'acne', -3)],
      scans: [],
      verdicts: new Map(),
      now: NOW,
    })
    expect(report.products.find((p) => p.name === 'Old')).toMatchObject({ active: false, verdictLabel: 'NO RESULT YET' })
    expect(report.products.find((p) => p.name === 'Odd')?.concern).toBe('something_else')
    expect(report.products.find((p) => p.name === 'Soon')?.day).toBe(0)
  })

  it('lists products by start date, then name', () => {
    const report = buildReport({ products: [product('a', 'B second', 'acne', 5), product('b', 'A first', 'acne', 10), product('c', 'A second', 'acne', 5)], scans: [], verdicts: new Map(), now: NOW })
    expect(report.products.map((p) => p.name)).toEqual(['A first', 'A second', 'B second'])
  })
})

describe('buildReport: scans', () => {
  it('has one row per scan, oldest first, rounded scores in concern order, flagged scans marked', () => {
    const report = buildReport({ products: [], scans: [scan(10, 71.6), scan(2, 57.2, true), scan(5, 60)], verdicts: new Map(), now: NOW })
    expect(report.scanCount).toBe(3)
    expect(report.scans.map((s) => s.scores[0])).toEqual([57, 60, 72])
    expect(report.scans.map((s) => s.flagged)).toEqual([true, false, false])
    expect(report.scans[0].scores).toHaveLength(CONCERN_KEYS.length)
    expect(report.firstScanAt).toBeLessThan(report.lastScanAt!)
  })

  it('marks the scan taken on the day a product started, and counts how many started', () => {
    const start = scan(10, 60).createdAt - 3 * 3_600_000 // the product started earlier that same day
    const report = buildReport({
      products: [{ _id: 'a', name: 'A', targetConcern: 'acne', startDate: Math.floor(start / DAY_MS) * DAY_MS }, { _id: 'b', name: 'B', targetConcern: 'pore', startDate: Math.floor(start / DAY_MS) * DAY_MS }],
      scans: [scan(3, 50), scan(10, 60)],
      verdicts: new Map(),
      now: NOW,
    })
    expect(report.scans.map((s) => s.startedProducts)).toEqual([0, 2])
  })

  it('shows a missing concern as null instead of a made-up number', () => {
    const report = buildReport({ products: [], scans: [{ createdAt: NOW, scores: { acne: 70 }, qualityFlag: false }], verdicts: new Map(), now: NOW })
    expect(report.scans[0].scores[0]).toBe(70)
    expect(report.scans[0].scores.slice(1).every((s) => s === null)).toBe(true)
  })

  it('is empty and safe with no data', () => {
    const report = buildReport({ products: [], scans: [], verdicts: new Map(), now: NOW })
    expect(report).toMatchObject({ scanCount: 0, firstScanAt: null, lastScanAt: null, products: [], scans: [] })
  })
})

describe('report wording', () => {
  it('states that it is not a medical assessment and that no photos are included', () => {
    expect(REPORT_DISCLAIMER).toMatch(/not a medical assessment or a diagnosis/)
    expect(REPORT_DISCLAIMER).toMatch(/No photos are stored or included/)
    expect(REPORT_DISCLAIMER).toMatch(/not a medical device/)
    expect(REPORT_DISCLAIMER).toMatch(/qualified professional/)
  })

  it('never diagnoses, recommends or promises anywhere in the generated text', () => {
    const report = buildReport({
      products: [product('a', 'Cleanser', 'acne', 35), product('b', 'Toner', 'redness', 35)],
      scans: [scan(5, 60)],
      verdicts: verdicts([
        ['a', { verdict: 'WORKING', reasons: [], inputs: inputs() }],
        ['b', { verdict: 'POSSIBLE_IRRITATION', reasons: [], inputs: inputs({ worsening: { concern: 'redness', amount: 9, threshold: 4 } }) }],
      ]),
      now: NOW,
    })
    const text = [REPORT_DISCLAIMER, ...report.howToRead, ...report.products.flatMap((p) => [p.verdictLabel, ...p.lines])].join(' ')
    expect(text).not.toMatch(/\b(diagnos(e|ed|is) you|you have|you should|we recommend|cure[sd]?|treats?|guarantee|proves?)\b/i)
  })

  it('uses the configured verdict numbers in "how to read this"', () => {
    const text = buildReport({ products: [], scans: [], verdicts: new Map(), now: NOW }).howToRead.join(' ')
    expect(text).toContain('28 days and 3 scans')
    expect(text).toContain('more than 2 times')
  })
})
