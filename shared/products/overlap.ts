// "Two products, same concern" (issue #41, feature 4). The verdict compares the target score before and after a
// product's start date, so two products on the same concern that started close together can't be told apart.
// This only WARNS: the verdict engine is untouched.
import { DAY_MS } from '../reminders/reminder-config'

export const OVERLAP_CONFIG = {
  /** Two products overlap when both are active and their start dates are at most this many days apart
   *  (the verdict's own minimum length, VERDICT_CONFIG.minDaysSinceStart). */
  startedWithinDays: 28,
}

export type OverlapProduct = { _id: string; name: string; targetConcern: string; startDate: number; endDate?: number | null }
export type Overlap = { id: string; name: string; daysApart: number }

const isActive = (product: Pick<OverlapProduct, 'endDate'>, now: number) => product.endDate == null || product.endDate > now

/**
 * The other active products that overlap with `subject`: same concern, active now, started within the window.
 * `subject.id` is left out of the result (a product never overlaps itself). A subject that has ended overlaps with
 * nothing; pass `endDate: undefined` for a product that is about to be created.
 */
export function overlapsFor(
  subject: { id?: string; targetConcern: string; startDate: number; endDate?: number | null },
  products: readonly OverlapProduct[],
  now: number,
): Overlap[] {
  if (!isActive(subject, now)) return []
  return products
    .filter((other) => other._id !== subject.id && other.targetConcern === subject.targetConcern && isActive(other, now))
    .map((other) => ({ id: other._id, name: other.name, daysApart: Math.round(Math.abs(other.startDate - subject.startDate) / DAY_MS) }))
    .filter((overlap) => overlap.daysApart <= OVERLAP_CONFIG.startedWithinDays)
    .sort((a, b) => a.daysApart - b.daysApart || a.name.localeCompare(b.name))
}

/** Product id -> its overlaps, only for products that have any. */
export function overlapMap(products: readonly OverlapProduct[], now: number): Map<string, Overlap[]> {
  const map = new Map<string, Overlap[]>()
  for (const product of products) {
    const overlaps = overlapsFor({ id: product._id, targetConcern: product.targetConcern, startDate: product.startDate, endDate: product.endDate }, products, now)
    if (overlaps.length > 0) map.set(product._id, overlaps)
  }
  return map
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** "the same day", "1 day apart", "3 days apart" (single product), or "within N days of each other" (several). */
export function startedPhrase(overlaps: readonly Overlap[]): string {
  if (overlaps.length === 1) {
    const days = overlaps[0].daysApart
    return days === 0 ? 'on the same day' : `${days} ${days === 1 ? 'day' : 'days'} apart`
  }
  const widest = Math.max(...overlaps.map((o) => o.daysApart))
  return widest === 0 ? 'on the same day' : `within ${widest} ${widest === 1 ? 'day' : 'days'} of each other`
}
