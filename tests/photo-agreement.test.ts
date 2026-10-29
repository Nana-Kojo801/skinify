import { describe, expect, it } from 'vitest'
import { describeAgreement, meanGap } from '../shared/scan/photo-agreement'
import { isPoorQuality } from '../shared/scan/combine-scores'
import { SCAN_CONFIG } from '../shared/scan/scan-config'

describe('meanGap', () => {
  it('averages the per-concern gaps', () => expect(meanGap({ a: 2, b: 4, c: 6 })).toBe(4))
  it('is 0 for no data', () => expect(meanGap({})).toBe(0))
})

describe('describeAgreement', () => {
  it('walks from very steady to quite uneven', () => {
    expect(describeAgreement(0.4).level).toBe('great')
    expect(describeAgreement(3).level).toBe('good')
    expect(describeAgreement(6).level).toBe('uneven')
    expect(describeAgreement(12).level).toBe('poor')
  })

  it('"poor" matches exactly when the scan is flagged as lower quality', () => {
    for (const gap of [0, 2, 5, 9.9, 10, 10.1, 25]) {
      const flagged = isPoorQuality({ any: gap }, SCAN_CONFIG.poorQualityMeanDiff)
      expect(describeAgreement(gap).level === 'poor', `gap ${gap}`).toBe(flagged)
    }
  })

  it('follows a custom threshold', () => {
    expect(describeAgreement(6, 20).level).toBe('good')
    expect(describeAgreement(6, 8).level).toBe('uneven')
  })

  it('every level has a label and a sentence', () => {
    for (const gap of [0, 3, 6, 12]) {
      const a = describeAgreement(gap)
      expect(a.label.length).toBeGreaterThan(3)
      expect(a.sentence.endsWith('.')).toBe(true)
    }
  })
})
