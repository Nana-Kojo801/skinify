/** JSON with object keys sorted, so equal values always give equal strings. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
}

interface SignatureSource<I> {
  verdict: string
  /** Any VerdictInputs: only the two day counters are read by name, the rest is compared as a whole. */
  inputs: I
}

/**
 * Identifies "the same verdict on the same data" so we don't store a new row (and ask the LLM again)
 * when nothing changed. The day counters change every day, so they are left out; for TOO_EARLY the
 * remaining time is kept but only in whole weeks, so that text ("about 2 more weeks") refreshes weekly.
 */
export function verdictSignature<I extends { daysSinceStart: number; daysRemaining: number }>({
  verdict,
  inputs,
}: SignatureSource<I>): string {
  const { daysSinceStart: _d, daysRemaining, ...data } = inputs
  const weeksLeft = verdict === 'TOO_EARLY' ? Math.ceil(daysRemaining / 7) : null
  return stableStringify([verdict, weeksLeft, data])
}
