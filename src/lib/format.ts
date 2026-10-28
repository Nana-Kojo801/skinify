const DAY_MS = 86_400_000

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatShortDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

/** Whole days from `fromMs` to `toMs`, never negative. */
export function daysBetween(fromMs: number, toMs: number): number {
  return Math.max(0, Math.floor((toMs - fromMs) / DAY_MS))
}

/** `<input type="date">` value (yyyy-mm-dd) for a timestamp, in the user's local time. */
export function toDateInputValue(ms: number): string {
  const d = new Date(ms)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/** Start of the local day for a yyyy-mm-dd value, as ms since epoch. */
export function fromDateInputValue(value: string): number {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

/** +13.1, −6.4, 0 (one decimal, a real minus sign, and plain 0 for no change). */
export function formatSigned(n: number, decimals = 1): string {
  const rounded = Number(n.toFixed(decimals))
  if (rounded === 0) return '0'
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toFixed(decimals)}`
}

/** 13.1, 3, 20.7: at most one decimal. */
export function formatPoints(n: number): string {
  return String(Number(n.toFixed(1)))
}
