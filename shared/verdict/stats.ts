export function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Sample standard deviation (n - 1). 0 when there are fewer than 2 values. */
export function sampleStdDev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)!
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}
