import { describe, expect, it } from 'vitest'
import { CONCERN_KEYS, isConcernKey } from '../shared/concerns'
import { combinePhotoScores, isPoorQuality } from '../shared/scan/combine-scores'
import { unitsPerPhoto } from '../shared/scan/scan-config'

describe('combinePhotoScores', () => {
  it('averages and measures the difference per concern', () => {
    const { scores, noise } = combinePhotoScores({ acne: 60, redness: 90 }, { acne: 70, redness: 88 })
    expect(scores).toEqual({ acne: 65, redness: 89 })
    expect(noise).toEqual({ acne: 10, redness: 2 })
  })

  it('only keeps concerns present in both photos', () => {
    expect(combinePhotoScores({ acne: 60, pore: 1 }, { acne: 62 }).scores).toEqual({ acne: 61 })
  })

  it('identical photos have zero noise', () => {
    expect(combinePhotoScores({ acne: 60 }, { acne: 60 }).noise).toEqual({ acne: 0 })
  })
})

describe('isPoorQuality', () => {
  it('flags when the mean difference reaches the threshold', () => {
    expect(isPoorQuality({ a: 10, b: 10 }, 10)).toBe(true)
    expect(isPoorQuality({ a: 4, b: 6 }, 10)).toBe(false)
  })
  it('flags an empty result', () => expect(isPoorQuality({}, 10)).toBe(true))
})

describe('concerns and unit pricing', () => {
  it('knows which concerns are valid', () => {
    expect(isConcernKey('acne')).toBe(true)
    expect(isConcernKey('toString')).toBe(false)
    expect(isConcernKey('hd_acne')).toBe(false)
  })
  it('matches the YouCam price tiers', () => {
    expect([1, 4, 5, 8, 9, 12, 13, 16].map(unitsPerPhoto)).toEqual([9, 9, 12, 12, 14, 14, 16, 16])
    expect(unitsPerPhoto(CONCERN_KEYS.length)).toBe(12) // 8 concerns requested
  })
})
