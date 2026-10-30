import { describe, expect, it } from 'vitest'
import { CONCERN_KEYS } from '../shared/concerns'
import { IDEAS, IDEAS_CONFIG } from '../shared/ideas/ideas-config'
import { pickIdeaBlocks, rankLabel } from '../shared/ideas/pick-ideas'

const scores = { acne: 72, redness: 87, pore: 44, texture: 56, oiliness: 44, moisture: 42, radiance: 62, dark_circle_v2: 75 }
const pick = (overrides: Partial<Parameters<typeof pickIdeaBlocks>[0]> = {}) => pickIdeaBlocks({ scores, qualityFlag: false, activeConcerns: [], ...overrides })

describe('pickIdeaBlocks', () => {
  it('returns the three lowest scores, lowest first, with ranks that share ties', () => {
    const blocks = pick()
    expect(blocks.map((b) => [b.concern, b.score, b.rank, b.tied])).toEqual([
      ['moisture', 42, 1, false],
      ['pore', 44, 2, true],
      ['oiliness', 44, 2, true],
    ])
    expect(blocks.map(rankLabel)).toEqual(['Lowest score right now', 'Tied for 2nd lowest', 'Tied for 2nd lowest'])
  })

  it('labels untied ranks plainly', () => {
    const blocks = pick({ scores: { acne: 10, redness: 20, pore: 30, texture: 90, oiliness: 90, moisture: 90, radiance: 90, dark_circle_v2: 90 } })
    expect(blocks.map(rankLabel)).toEqual(['Lowest score right now', '2nd lowest', '3rd lowest'])
  })

  it('suggests nothing when the scan was flagged as poor quality', () => {
    expect(pick({ qualityFlag: true })).toEqual([])
  })

  it('skips concerns that already have an active product and fills from the next lowest', () => {
    const blocks = pick({ activeConcerns: ['moisture', 'pore'] })
    expect(blocks.map((b) => b.concern)).toEqual(['oiliness', 'texture', 'radiance'])
    expect(blocks.map((b) => b.rank)).toEqual([1, 2, 3])
  })

  it('returns fewer blocks when fewer concerns are left, and ignores unknown or broken scores', () => {
    expect(pick({ scores: { acne: 50, nonsense: 1, pore: Number.NaN } })).toHaveLength(1)
    expect(pick({ scores: {} })).toEqual([])
    expect(pick({ activeConcerns: CONCERN_KEYS })).toEqual([])
  })

  it('never returns more ideas than configured', () => {
    for (const block of pick()) expect(block.ideas.length).toBeLessThanOrEqual(IDEAS_CONFIG.maxIdeasPerConcern)
  })
})

describe('the curated list', () => {
  const flat = CONCERN_KEYS.flatMap((key) => IDEAS[key].ideas.map((idea) => ({ key, ...idea })))

  it('covers every concern with 2 to 3 ideas', () => {
    for (const key of CONCERN_KEYS) {
      expect(IDEAS[key].ideas.length).toBeGreaterThanOrEqual(2)
      expect(IDEAS[key].ideas.length).toBeLessThanOrEqual(3)
    }
  })

  it('has no prescription or drug-like ingredients and no promises', () => {
    const banned = /retinol|retinoid|retin-a|tretinoin|adapalene|benzoyl|clindamycin|antibiotic|hydroquinone|steroid|cortisone|isotretinoin/i
    const promises = /\b(cures?|treats?|fix(es)?|heals?|removes?|eliminates?|guarantee)/i
    for (const idea of flat) {
      expect(idea.name).not.toMatch(banned)
      expect(idea.for).not.toMatch(banned)
      expect(idea.for).not.toMatch(promises)
    }
  })

  it('has no repeated idea within one concern and no brand-looking names', () => {
    for (const key of CONCERN_KEYS) {
      const names = IDEAS[key].ideas.map((i) => i.name)
      expect(new Set(names).size).toBe(names.length)
    }
    for (const idea of flat) expect(idea.name).not.toMatch(/™|®|\b(cerave|la roche|the ordinary|neutrogena|olay|garnier|nivea)\b/i)
  })
})
