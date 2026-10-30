import { describe, expect, it } from 'vitest'
import { DAY_MS } from '../shared/reminders/reminder-config'
import { joinNames, OVERLAP_CONFIG, overlapMap, overlapsFor, startedPhrase, type OverlapProduct } from '../shared/products/overlap'

const NOW = Date.UTC(2026, 10, 1)
const day = (n: number) => NOW + n * DAY_MS
const product = (id: string, concern: string, startOffsetDays: number, endOffsetDays?: number): OverlapProduct => ({
  _id: id,
  name: `Product ${id}`,
  targetConcern: concern,
  startDate: day(startOffsetDays),
  endDate: endOffsetDays === undefined ? undefined : day(endOffsetDays),
})

describe('overlapsFor', () => {
  it('finds an active product on the same concern that started close by, with the days between', () => {
    const products = [product('a', 'moisture', -10), product('b', 'moisture', -7)]
    expect(overlapsFor({ id: 'a', targetConcern: 'moisture', startDate: day(-10) }, products, NOW)).toEqual([{ id: 'b', name: 'Product b', daysApart: 3 }])
  })

  it('never overlaps with itself, with another concern, or with an ended product', () => {
    const products = [product('a', 'moisture', -10), product('b', 'acne', -10), product('c', 'moisture', -9, -1)]
    expect(overlapsFor({ id: 'a', targetConcern: 'moisture', startDate: day(-10) }, products, NOW)).toEqual([])
  })

  it('treats a product whose end date is still ahead as active, and one ending exactly now as ended', () => {
    const subject = { id: 'a', targetConcern: 'pore', startDate: day(-5) }
    expect(overlapsFor(subject, [product('b', 'pore', -4, 10)], NOW)).toHaveLength(1)
    expect(overlapsFor(subject, [product('b', 'pore', -4, 0)], NOW)).toHaveLength(0)
  })

  it('uses the configured window: exactly at the limit overlaps, one day more does not', () => {
    const subject = { id: 'a', targetConcern: 'pore', startDate: day(-60) }
    const limit = OVERLAP_CONFIG.startedWithinDays
    expect(overlapsFor(subject, [product('b', 'pore', -60 + limit)], NOW)).toHaveLength(1)
    expect(overlapsFor(subject, [product('b', 'pore', -60 + limit + 1)], NOW)).toHaveLength(0)
    // before or after makes no difference
    expect(overlapsFor(subject, [product('b', 'pore', -60 - limit)], NOW)).toHaveLength(1)
  })

  it('a subject that has ended has no overlaps', () => {
    expect(overlapsFor({ id: 'a', targetConcern: 'pore', startDate: day(-5), endDate: day(-1) }, [product('b', 'pore', -4)], NOW)).toEqual([])
  })

  it('works for a product that is not saved yet (no id)', () => {
    expect(overlapsFor({ targetConcern: 'pore', startDate: day(0) }, [product('b', 'pore', -3)], NOW)).toMatchObject([{ id: 'b', daysApart: 3 }])
  })

  it('lists several, closest first', () => {
    const products = [product('a', 'acne', 0), product('b', 'acne', -12), product('c', 'acne', 2)]
    expect(overlapsFor({ id: 'a', targetConcern: 'acne', startDate: day(0) }, products, NOW).map((o) => [o.id, o.daysApart])).toEqual([
      ['c', 2],
      ['b', 12],
    ])
  })
})

describe('overlapMap', () => {
  it('maps each overlapping product to the others, and leaves out products with none', () => {
    const map = overlapMap([product('a', 'moisture', -10), product('b', 'moisture', -8), product('c', 'acne', -9)], NOW)
    expect([...map.keys()].sort()).toEqual(['a', 'b'])
    expect(map.get('a')?.map((o) => o.id)).toEqual(['b'])
    expect(map.get('b')?.map((o) => o.id)).toEqual(['a'])
  })

  it('is empty for the demo data shape: three products on three different concerns', () => {
    expect(overlapMap([product('a', 'oiliness', -34), product('b', 'moisture', -34), product('c', 'acne', -35)], NOW).size).toBe(0)
  })
})

describe('wording helpers', () => {
  it('joins names', () => {
    expect(joinNames([])).toBe('')
    expect(joinNames(['A'])).toBe('A')
    expect(joinNames(['A', 'B'])).toBe('A and B')
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B and C')
  })
  it('describes how far apart they started', () => {
    expect(startedPhrase([{ id: 'a', name: 'A', daysApart: 0 }])).toBe('on the same day')
    expect(startedPhrase([{ id: 'a', name: 'A', daysApart: 1 }])).toBe('1 day apart')
    expect(startedPhrase([{ id: 'a', name: 'A', daysApart: 3 }])).toBe('3 days apart')
    expect(startedPhrase([{ id: 'a', name: 'A', daysApart: 3 }, { id: 'b', name: 'B', daysApart: 12 }])).toBe('within 12 days of each other')
    expect(startedPhrase([{ id: 'a', name: 'A', daysApart: 0 }, { id: 'b', name: 'B', daysApart: 1 }])).toBe('within 1 day of each other')
    expect(startedPhrase([{ id: 'a', name: 'A', daysApart: 0 }, { id: 'b', name: 'B', daysApart: 0 }])).toBe('on the same day')
  })
})
