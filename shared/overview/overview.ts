// "Your skin overview" (issue #41, feature 6): the radar chart of the 8 concerns, first scan vs latest scan, plus
// YouCam's own overall score. Display only: verdicts never use any of this.
import { CONCERN_KEYS, CONCERNS, type ConcernKey } from '../concerns'

export type OverviewScan = { createdAt: number; scores: Record<string, number>; qualityFlag: boolean; overall?: number | null }

export const OVERVIEW_CONFIG = {
  /** A concern counts as "moved" when its rounded score changed by at least this many points. */
  movedAtLeast: 1,
  /** How many moved concerns the list under the chart names. */
  maxMoved: 4,
}

export type OverviewRow = { key: ConcernKey; label: string; before: number; now: number; delta: number }

export type Overview = {
  firstAt: number
  latestAt: number
  rows: OverviewRow[]
  /** Concerns that moved, biggest change first (at most maxMoved). */
  moved: OverviewRow[]
  /** How many shown concerns moved less than the threshold (named together as "every other concern"). */
  stillCount: number
  overall: { now: number; delta: number | null } | null
}

const round = (n: number) => Math.round(n)

/**
 * First scan vs latest scan, using only scans that were not flagged as poor quality (their numbers can't be
 * trusted). Null when fewer than 2 such scans exist, or no concern is present in both.
 */
export function buildOverview(scans: readonly OverviewScan[]): Overview | null {
  const good = scans.filter((scan) => !scan.qualityFlag).sort((a, b) => a.createdAt - b.createdAt)
  if (good.length < 2) return null
  const first = good[0]
  const latest = good[good.length - 1]

  const rows: OverviewRow[] = []
  for (const key of CONCERN_KEYS) {
    const before = first.scores[key]
    const now = latest.scores[key]
    if (!Number.isFinite(before) || !Number.isFinite(now)) continue
    rows.push({ key, label: CONCERNS[key].label, before, now, delta: round(now) - round(before) })
  }
  if (rows.length === 0) return null

  const movedAll = rows.filter((row) => Math.abs(row.delta) >= OVERVIEW_CONFIG.movedAtLeast).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  const moved = movedAll.slice(0, OVERVIEW_CONFIG.maxMoved)
  const hasOverall = typeof latest.overall === 'number' && Number.isFinite(latest.overall)
  const hadOverall = typeof first.overall === 'number' && Number.isFinite(first.overall)
  return {
    firstAt: first.createdAt,
    latestAt: latest.createdAt,
    rows,
    moved,
    stillCount: rows.length - moved.length,
    overall: hasOverall ? { now: round(latest.overall as number), delta: hadOverall ? round(latest.overall as number) - round(first.overall as number) : null } : null,
  }
}

/** "+15", "-3", "0". */
export function signed(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta)
}
