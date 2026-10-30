import { DAY_MS } from '../reminders/reminder-config'
import { MAX_GAP_MS, MIN_COUNTED_MS, RHYTHM_CONFIG } from './rhythm-config'

export type Streak = {
  /** Weeks in the current streak (0 when there are no scans). */
  weeks: number
  /** true when the last scan is recent enough that the streak is still going. */
  alive: boolean
  /** The streak as of the last scan, even when it has paused ("last streak: 3 weeks"). */
  lastStreakWeeks: number
  /** Longest streak ever. */
  best: number
  lastScanAt: number | null
  /** Oldest first: whether there was a scan in each of the last `weeksShown` 7-day windows ending now. */
  recent: boolean[]
  /** The next goal above the current streak, or null once all goals are reached. */
  nextGoal: number | null
}

/**
 * The weekly scan streak. Scans are walked oldest to newest: a scan continues the streak if it comes within
 * `maxGapDays` of the previous scan, otherwise a new streak starts. It adds a week only if it is at least
 * `minDaysBetweenCounted` days after the last counted scan (several scans in one week count once).
 * A streak that has gone quiet for longer than the gap is "paused", never "lost": it just stops being alive.
 */
export function computeStreak(scanTimes: readonly number[], now: number): Streak {
  const times = [...scanTimes].filter(Number.isFinite).sort((a, b) => a - b)
  let weeks = 0
  let best = 0
  let previous: number | null = null
  let lastCounted: number | null = null
  for (const time of times) {
    if (previous === null || time - previous > MAX_GAP_MS) {
      weeks = 1
      lastCounted = time
    } else if (lastCounted !== null && time - lastCounted >= MIN_COUNTED_MS) {
      weeks += 1
      lastCounted = time
    }
    best = Math.max(best, weeks)
    previous = time
  }

  const lastScanAt = times.length > 0 ? times[times.length - 1] : null
  const alive = lastScanAt !== null && now - lastScanAt <= MAX_GAP_MS
  const recent: boolean[] = []
  for (let i = RHYTHM_CONFIG.weeksShown - 1; i >= 0; i--) {
    const end = now - i * 7 * DAY_MS
    const start = end - 7 * DAY_MS
    recent.push(times.some((time) => time > start && time <= end))
  }
  const current = alive ? weeks : 0
  return {
    weeks: current,
    alive,
    lastStreakWeeks: weeks,
    best,
    lastScanAt,
    recent,
    nextGoal: RHYTHM_CONFIG.streakGoals.find((goal) => goal > current) ?? null,
  }
}
