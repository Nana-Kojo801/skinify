import { VERDICT_CONFIG } from '../verdict/verdict-config'
import { DAY_MS, REMINDER_CONFIG } from '../reminders/reminder-config'

// "Your rhythm" (issue #41, feature 7): the scan streak and the milestones. Everything here is derived from the
// person's own scans, products and verdicts. Tune the numbers here.
export const RHYTHM_CONFIG = {
  /** A scan keeps the streak alive when it comes at most this many days after the previous one (a week plus grace). */
  maxGapDays: REMINDER_CONFIG.scanIntervalDays + 2,
  /** A scan adds a week to the streak only when it is at least this many days after the last counted scan:
   *  extra scans in the same week don't inflate it. */
  minDaysBetweenCounted: 5,
  /** The row of boxes shows this many recent weeks. */
  weeksShown: 8,
  /** Streak goals to aim for, in weeks. */
  streakGoals: [4, 8, 12],
  /** "Day 28" is the verdict's own minimum length, so the milestone moves with it. */
  productDaysMilestone: VERDICT_CONFIG.minDaysSinceStart,
  /** A milestone is celebrated only if it was reached within this many days (no confetti for old news). */
  celebrateWithinDays: 7,
}

export const MAX_GAP_MS = RHYTHM_CONFIG.maxGapDays * DAY_MS
export const MIN_COUNTED_MS = RHYTHM_CONFIG.minDaysBetweenCounted * DAY_MS
