// Everything about scan reminders that is a number or a list. Tune here.
export const REMINDER_CONFIG = {
  /** The next scan is due this many days after the latest one (spec: weekly). */
  scanIntervalDays: 7,
  /** The reminder goes out this many calendar days before the due date, in the user's own time zone... */
  leadDays: 1,
  /** ...at this local hour (24h clock). */
  hourLocal: 9,
  /** After this many reminders in a row with no scan in between, stop (the user can switch reminders back on). */
  maxRemindersPerScan: 3,
  /** Used when a browser reports no (or an unknown) time zone. */
  fallbackTimeZone: 'UTC',
  /** Addresses on these domains (or their subdomains) never get email: our own test accounts use them. */
  testDomains: ['example.com', 'example.org', 'example.net', 'example.edu', 'example', 'test', 'invalid', 'localhost'],
}

export const DAY_MS = 86_400_000
export const SCAN_INTERVAL_MS = REMINDER_CONFIG.scanIntervalDays * DAY_MS
