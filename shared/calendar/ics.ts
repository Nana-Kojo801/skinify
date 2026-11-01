// A tiny iCalendar (.ics) file: one all-day event that repeats every week. Built in the browser, nothing is sent
// anywhere. Works in Apple Calendar, Google Calendar and Outlook (RFC 5545: CRLF line ends, lines folded at 75 bytes).

export const escapeText = (text: string) => text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Folds a content line to at most 75 UTF-8 bytes per line; continuation lines start with one space. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder()
  if (encoder.encode(line).length <= 75) return line
  const lines: string[] = []
  let current = ''
  for (const char of line) {
    const limit = lines.length === 0 ? 75 : 74 // continuation lines carry a leading space
    if (encoder.encode(current + char).length > limit) {
      lines.push(current)
      current = char
    } else {
      current += char
    }
  }
  lines.push(current)
  return lines.map((part, index) => (index === 0 ? part : ` ${part}`)).join('\r\n')
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0')
const dateValue = (y: number, m: number, d: number) => `${pad(y, 4)}${pad(m)}${pad(d)}`
const stamp = (date: Date) =>
  `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`

export type WeeklyScanEvent = {
  /** First day of the event, as the person's own calendar date. */
  date: { year: number; month: number; day: number }
  /** A unique id for the event (any stable string). */
  uid: string
  /** When the file was made, for DTSTAMP. */
  createdAt: Date
  appUrl?: string
}

export function buildWeeklyScanIcs(event: WeeklyScanEvent): string {
  const description = ['Two quick photos, taken back to back in the same light.', event.appUrl ? `Scan: ${event.appUrl.replace(/\/$/, '')}/scan` : ''].filter(Boolean).join('\n')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Skinify//Weekly scan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}@skinify`,
    `DTSTAMP:${stamp(event.createdAt)}`,
    `DTSTART;VALUE=DATE:${dateValue(event.date.year, event.date.month, event.date.day)}`,
    'RRULE:FREQ=WEEKLY',
    `SUMMARY:${escapeText('Weekly skin scan (Skinify)')}`,
    `DESCRIPTION:${escapeText(description)}`,
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `${lines.map(foldLine).join('\r\n')}\r\n`
}
