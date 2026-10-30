import { describe, expect, it } from 'vitest'
import { cleanBrightness, coachHints, lightingLevel, LIGHTING_CONFIG, meanLuma, scanBrightness } from '../shared/scan/lighting'

const pixels = (...rgb: number[][]) => Uint8ClampedArray.from(rgb.flatMap(([r, g, b]) => [r, g, b, 255]))

describe('meanLuma', () => {
  it('is 0 for black, 255 for white and weights green most', () => {
    expect(meanLuma(pixels([0, 0, 0], [0, 0, 0]))).toBe(0)
    expect(meanLuma(pixels([255, 255, 255]))).toBeCloseTo(255, 5)
    expect(meanLuma(pixels([0, 255, 0]))).toBeGreaterThan(meanLuma(pixels([255, 0, 0])))
    expect(meanLuma(pixels([255, 255, 255], [0, 0, 0]))).toBeCloseTo(127.5, 5)
  })
  it('handles empty data', () => {
    expect(meanLuma(new Uint8ClampedArray(0))).toBe(0)
  })
})

describe('lightingLevel', () => {
  it('splits at the configured thresholds', () => {
    expect(lightingLevel(LIGHTING_CONFIG.tooDarkBelow - 1)).toBe('dark')
    expect(lightingLevel(LIGHTING_CONFIG.tooDarkBelow)).toBe('ok')
    expect(lightingLevel(LIGHTING_CONFIG.tooBrightAbove)).toBe('ok')
    expect(lightingLevel(LIGHTING_CONFIG.tooBrightAbove + 1)).toBe('bright')
  })
})

describe('coachHints', () => {
  it('says nothing for two even, well-lit photos', () => {
    const { perPhoto, notes } = coachHints([130, 140], 135)
    expect(perPhoto.map((p) => p?.level)).toEqual(['ok', 'ok'])
    expect(notes).toEqual([])
  })

  it('flags a dark or bright photo, and nothing for a photo that is not chosen yet', () => {
    expect(coachHints([40, null], null).perPhoto.map((p) => p?.text)).toEqual(['Looks quite dark', undefined])
    expect(coachHints([null, 230], null).perPhoto[1]).toMatchObject({ level: 'bright', text: 'Looks very bright' })
  })

  it('notes when the two photos have different light, naming the darker one', () => {
    const first = coachHints([80, 140], null).notes
    expect(first).toHaveLength(1)
    expect(first[0]).toMatchObject({ id: 'pair' })
    expect(first[0].text).toContain('Photo 1 is much darker than photo 2')
    expect(coachHints([150, 90], null).notes[0].text).toContain('Photo 2 is much darker than photo 1')
    // exactly at the threshold is not "different"
    expect(coachHints([100, 100 + LIGHTING_CONFIG.pairGapAbove], null).notes).toEqual([])
  })

  it('notes when the lighting differs from the last scan, and says which way', () => {
    const brighter = coachHints([100, 110], 170).notes
    expect(brighter).toMatchObject([{ id: 'last-scan', title: 'Lighting differs from your last scan' }])
    expect(brighter[0].text).toContain('Your last scan was brighter')
    expect(coachHints([180, 190], 100).notes[0].text).toContain('Your last scan was darker')
  })

  it('has no last-scan note without a previous number, or with a nonsense one', () => {
    expect(coachHints([100, 110], undefined).notes).toEqual([])
    expect(coachHints([100, 110], null).notes).toEqual([])
    expect(coachHints([100, 110], 9999).notes).toEqual([])
  })

  it('compares with the one photo it has when only one is chosen', () => {
    expect(coachHints([100, null], 200).notes.map((n) => n.id)).toEqual(['last-scan'])
  })
})

describe('cleanBrightness and scanBrightness', () => {
  it('accepts 0 to 255, rounds to one decimal, drops everything else', () => {
    expect(cleanBrightness(0)).toBe(0)
    expect(cleanBrightness(255)).toBe(255)
    expect(cleanBrightness(123.456)).toBe(123.5)
    for (const bad of [-1, 256, Number.NaN, Number.POSITIVE_INFINITY, null, undefined]) expect(cleanBrightness(bad)).toBeNull()
  })
  it('averages the photos it could measure', () => {
    expect(scanBrightness([100, 140])).toBe(120)
    expect(scanBrightness([100, null])).toBe(100)
    expect(scanBrightness([null, null])).toBeNull()
  })
})
