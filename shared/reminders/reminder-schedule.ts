import { DAY_MS, REMINDER_CONFIG, SCAN_INTERVAL_MS } from './reminder-config'

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

export function safeTimeZone(timeZone: string | undefined | null): string {
  return timeZone && isValidTimeZone(timeZone) ? timeZone : REMINDER_CONFIG.fallbackTimeZone
}

type LocalParts = { year: number; month: number; day: number; hour: number; minute: number }

/** The wall-clock date and time in `timeZone` at the instant `ms`. */
function localParts(ms: number, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(new Date(ms))
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') }
}

/** The instant (ms) at which the wall clock in `timeZone` reads year-month-day hour:00. Handles DST. */
function instantOfLocalTime(year: number, month: number, day: number, hour: number, timeZone: string): number {
  const asIfUtc = Date.UTC(year, month - 1, day, hour)
  let guess = asIfUtc
  // The zone's offset depends on the instant, so settle on it in two steps.
  for (let i = 0; i < 2; i++) {
    const p = localParts(guess, timeZone)
    const localAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
    guess -= localAsUtc - asIfUtc
  }
  return guess
}

/** When the reminder for a scan due at `dueAt` goes out: `leadDays` before the due day, at `hourLocal`, local time. */
export function reminderTimeFor(dueAt: number, timeZone: string): number {
  const zone = safeTimeZone(timeZone)
  const dueLocal = localParts(dueAt, zone)
  // Step back whole calendar days on the local date (Date.UTC handles month and year borders).
  const reminderDay = new Date(Date.UTC(dueLocal.year, dueLocal.month - 1, dueLocal.day) - REMINDER_CONFIG.leadDays * DAY_MS)
  return instantOfLocalTime(
    reminderDay.getUTCFullYear(),
    reminderDay.getUTCMonth() + 1,
    reminderDay.getUTCDate(),
    REMINDER_CONFIG.hourLocal,
    zone,
  )
}

/** What the app shows: the next scan is due one interval after the latest scan. */
export function nextScanDueAt(latestScanAt: number): number {
  return latestScanAt + SCAN_INTERVAL_MS
}

export type ReminderState = {
  /** createdAt of the user's latest scan. */
  latestScanAt: number
  timeZone: string | undefined
  /** The due date we last emailed about, if any. */
  lastReminderDue: number | undefined
  /** Reminders already sent for the scan in `reminderScanAt` (0 when that scan is not the latest). */
  remindersSentForLatestScan: number
}

export type ReminderDecision = { send: false } | { send: true; dueAt: number; reminderAt: number }

/**
 * Whether a reminder should go out right now. Due dates come in weekly slots counted from the latest scan, so a
 * new scan moves every slot (nothing to cancel), and a missed week simply moves on to the next slot:
 * the slot is the first one whose due date is still in the future. One reminder per slot, at most
 * `maxRemindersPerScan` per scan.
 */
export function decideReminder(state: ReminderState, now: number): ReminderDecision {
  if (state.remindersSentForLatestScan >= REMINDER_CONFIG.maxRemindersPerScan) return { send: false }
  const slot = Math.max(0, Math.floor((now - state.latestScanAt) / SCAN_INTERVAL_MS))
  const dueAt = state.latestScanAt + (slot + 1) * SCAN_INTERVAL_MS
  if (state.lastReminderDue === dueAt) return { send: false }
  const reminderAt = reminderTimeFor(dueAt, safeTimeZone(state.timeZone))
  if (now < reminderAt || now >= dueAt) return { send: false }
  return { send: true, dueAt, reminderAt }
}
