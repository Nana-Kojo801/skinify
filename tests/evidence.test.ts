import { describe, expect, it } from 'vitest'
import { describeEvidence } from '../shared/verdict/evidence'
import { EVIDENCE_CONFIG } from '../shared/verdict/verdict-config'
import type { VerdictInputs } from '../shared/verdict/verdict-types'

const inputs = (overrides: Partial<VerdictInputs> = {}): VerdictInputs => ({
  targetConcern: 'acne',
  direction: 'higher',
  daysSinceStart: 35,
  daysRemaining: 0,
  baselineCount: 2,
  postCount: 5,
  postScansRemaining: 0,
  baselineMean: 60,
  recentPostMean: 73,
  change: 13,
  improvement: 13,
  noise: 1.7,
  noiseThreshold: 3.4,
  noiseRatio: 0.02,
  flaggedPoorQuality: false,
  worsening: null,
  ...overrides,
})

describe('describeEvidence: WORKING', () => {
  it('is Solid with a clear margin and deep data, and states the facts plainly', () => {
    const e = describeEvidence('WORKING', inputs())!
    expect(e).toMatchObject({ level: 'solid', label: 'Solid', bars: 3 })
    expect(e.facts).toEqual(['5 scans since you started, 35 days tracked', 'Your change is 3.8 times normal variation'])
  })

  it('is Fair with a clear margin but little data, or deep data but a small margin', () => {
    expect(describeEvidence('WORKING', inputs({ postCount: 3, daysSinceStart: 29 }))?.level).toBe('fair')
    expect(describeEvidence('WORKING', inputs({ improvement: 4.2 }))?.level).toBe('fair') // 1.2x
  })

  it('is Thin just past the line with the minimum data, and says so', () => {
    const e = describeEvidence('WORKING', inputs({ improvement: 3.7, postCount: 3, daysSinceStart: 29 }))!
    expect(e.level).toBe('thin')
    expect(e.facts[1]).toBe('Your change is 1.1 times normal variation, only just past the line')
  })

  it('uses the live day count when given', () => {
    expect(describeEvidence('WORKING', inputs({ daysSinceStart: 20 }), 40)?.level).toBe('solid')
    expect(describeEvidence('WORKING', inputs(), 1)?.facts[0]).toBe('5 scans since you started, 1 day tracked')
  })

  it('sits exactly on the configured cut-offs', () => {
    const threshold = 4
    const atMargin = inputs({ noiseThreshold: threshold, improvement: threshold * EVIDENCE_CONFIG.clearMargin })
    expect(describeEvidence('WORKING', atMargin)?.level).toBe('solid')
    expect(describeEvidence('WORKING', { ...atMargin, improvement: threshold * EVIDENCE_CONFIG.clearMargin - 0.01 })?.level).toBe('fair')
    expect(describeEvidence('WORKING', { ...atMargin, postCount: EVIDENCE_CONFIG.deepPostScans - 1 })?.level).toBe('fair')
    expect(describeEvidence('WORKING', { ...atMargin, daysSinceStart: EVIDENCE_CONFIG.deepDays - 1 })?.level).toBe('fair')
  })
})

describe('describeEvidence: other verdicts', () => {
  it('NO_VISIBLE_CHANGE: Solid when clearly flat with deep data, Fair when near the line, with the band in the facts', () => {
    const flat = describeEvidence('NO_VISIBLE_CHANGE', inputs({ improvement: 0.3, noiseThreshold: 3.1 }))!
    expect(flat.level).toBe('solid')
    expect(flat.facts[1]).toBe('Your change is inside normal variation (±3.1)')
    expect(describeEvidence('NO_VISIBLE_CHANGE', inputs({ improvement: 2.5, noiseThreshold: 3.1 }))?.level).toBe('fair') // deep data only
    expect(describeEvidence('NO_VISIBLE_CHANGE', inputs({ improvement: 2.5, noiseThreshold: 3.1, postCount: 3, daysSinceStart: 29 }))?.level).toBe('thin')
  })

  it('NO_VISIBLE_CHANGE with a missing change is never "clearly flat"', () => {
    expect(describeEvidence('NO_VISIBLE_CHANGE', inputs({ improvement: null, postCount: 3, daysSinceStart: 29 }))?.level).toBe('thin')
  })

  it('POSSIBLE_IRRITATION names the concern and uses the worsening margin', () => {
    const e = describeEvidence('POSSIBLE_IRRITATION', inputs({ worsening: { concern: 'redness', amount: 9, threshold: 4 } }))!
    expect(e.level).toBe('solid')
    expect(e.facts[1]).toBe('Your redness got worse by 2.3 times normal variation')
  })

  it('CANT_TELL is always Thin and points back at the reasons; TOO_EARLY has no strip', () => {
    const cantTell = describeEvidence('CANT_TELL', inputs())!
    expect(cantTell).toMatchObject({ level: 'thin', bars: 1 })
    expect(cantTell.facts).toHaveLength(1)
    expect(cantTell.next).toContain('listed above')
    expect(describeEvidence('TOO_EARLY', inputs())).toBeNull()
  })
})

describe('describeEvidence: wording', () => {
  it('never promises that more scans confirm anything, and always rates the measurement, not the product', () => {
    for (const verdict of ['WORKING', 'NO_VISIBLE_CHANGE', 'CANT_TELL', 'POSSIBLE_IRRITATION'] as const) {
      for (const postCount of [1, 3, 5, 8]) {
        const e = describeEvidence(verdict, inputs({ postCount, worsening: { concern: 'redness', amount: 5, threshold: 4 } }))!
        const text = [...e.facts, e.next, e.note].join(' ')
        expect(text).not.toMatch(/confirm|prove|guarantee|certain|definitely/i)
        expect(e.note).toBe('This rates the measurement, not the product.')
      }
    }
  })

  it('pluralises scans and days', () => {
    expect(describeEvidence('WORKING', inputs({ postCount: 1, daysSinceStart: 1 }))?.facts[0]).toBe('1 scan since you started, 1 day tracked')
  })

  it('does not divide by a zero threshold', () => {
    expect(() => describeEvidence('WORKING', inputs({ noiseThreshold: 0 }))).not.toThrow()
  })
})
