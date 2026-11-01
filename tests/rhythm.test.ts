import { describe, expect, it } from 'vitest'
import { buildWeeklyScanIcs, escapeText, foldLine } from '../shared/calendar/ics'
import { buildMilestones, celebrationText, newMilestones } from '../shared/rhythm/milestones'
import { RHYTHM_CONFIG } from '../shared/rhythm/rhythm-config'
import { computeStreak } from '../shared/rhythm/streak'
import { DAY_MS } from '../shared/reminders/reminder-config'

const T0 = Date.UTC(2026, 8, 1, 10)
const at = (day: number, hour = 0) => T0 + day * DAY_MS + hour * 3_600_000

describe('computeStreak', () => {
  it('is empty without scans', () => {
    expect(computeStreak([], T0)).toMatchObject({ weeks: 0, alive: false, best: 0, lastScanAt: null, nextGoal: 4 })
    expect(computeStreak([], T0).recent).toEqual(Array(RHYTHM_CONFIG.weeksShown).fill(false))
  })

  it('counts a weekly chain, alive while the last scan is within the gap', () => {
    const scans = [at(0), at(7), at(14), at(21)]
    expect(computeStreak(scans, at(24))).toMatchObject({ weeks: 4, alive: true, best: 4, nextGoal: 8 })
    // the 9-day gap (7 plus 2 grace) is allowed, 10 days pauses it
    expect(computeStreak(scans, at(21 + RHYTHM_CONFIG.maxGapDays)).alive).toBe(true)
    const paused = computeStreak(scans, at(21 + RHYTHM_CONFIG.maxGapDays + 1))
    expect(paused).toMatchObject({ weeks: 0, alive: false, lastStreakWeeks: 4, best: 4 })
  })

  it('a gap longer than the allowed one starts a new streak, and best remembers the longest', () => {
    const scans = [at(0), at(7), at(14), at(30), at(37)] // 16-day gap after day 14
    expect(computeStreak(scans, at(38))).toMatchObject({ weeks: 2, best: 3, alive: true })
  })

  it('several scans in one week count once, and do not break the chain', () => {
    expect(computeStreak([at(0), at(1), at(3), at(7)], at(8)).weeks).toBe(2)
    // day 0 counted, day 3 extra, day 10: within 9 days of day 3, and 10 days after the last counted scan
    expect(computeStreak([at(0), at(3), at(10)], at(11)).weeks).toBe(2)
  })

  it('two scans on the same day are one week', () => {
    expect(computeStreak([at(0, 0), at(0, 5)], at(1)).weeks).toBe(1)
  })

  it('ignores the order it is given and bad numbers', () => {
    expect(computeStreak([at(14), Number.NaN, at(0), at(7)], at(15)).weeks).toBe(3)
  })

  it('fills the boxes for the weeks that had a scan, oldest first', () => {
    const now = at(60)
    const recent = computeStreak([now - 2 * DAY_MS, now - 9 * DAY_MS, now - 30 * DAY_MS], now).recent
    expect(recent).toHaveLength(RHYTHM_CONFIG.weeksShown)
    expect(recent.slice(-3)).toEqual([false, true, true]) // 9 days ago is in the previous week window, 2 days ago in this one
    expect(recent[recent.length - 5]).toBe(true) // 30 days ago
  })

  it('names the next goal above the current streak, and none once all are reached', () => {
    const long = Array.from({ length: 13 }, (_, i) => at(i * 7))
    expect(computeStreak(long, at(13 * 7)).nextGoal).toBeNull()
    expect(computeStreak(long.slice(0, 5), at(5 * 7)).nextGoal).toBe(8)
  })
})

describe('buildMilestones', () => {
  const base = { scanTimes: [at(0), at(7)], products: [{ name: 'Cleanser', startDate: at(0) }], firstWorking: null, bestStreak: 2, currentStreak: 2, now: at(40) }

  it('lists what is reached with its date and what is still to come', () => {
    const list = buildMilestones(base)
    expect(list.map((m) => [m.id, m.achieved])).toEqual([
      ['first-scan', true],
      ['first-working', false],
      ['product-days', true],
      ['streak-4', false],
    ])
    expect(list[0].achievedAt).toBe(at(0))
    expect(list[2]).toMatchObject({ achievedAt: at(0) + 28 * DAY_MS, detail: 'Cleanser' })
    expect(list[3].progress).toBe('2 to go')
  })

  it('uses the earliest product to reach 28 days, and none that has not got there yet', () => {
    const list = buildMilestones({ ...base, now: at(20), products: [{ name: 'New', startDate: at(0) }] })
    expect(list.find((m) => m.id === 'product-days')?.achieved).toBe(false)
    const two = buildMilestones({ ...base, products: [{ name: 'Later', startDate: at(5) }, { name: 'Earlier', startDate: at(1) }] })
    expect(two.find((m) => m.id === 'product-days')?.detail).toBe('Earlier')
  })

  it('shows the first Working verdict with its product, and adds streak goals as they are reached', () => {
    const list = buildMilestones({ ...base, firstWorking: { createdAt: at(30), productName: 'Cleanser' }, bestStreak: 5 })
    expect(list.find((m) => m.id === 'first-working')).toMatchObject({ achieved: true, achievedAt: at(30), detail: 'Cleanser' })
    expect(list.filter((m) => m.id.startsWith('streak-')).map((m) => [m.id, m.achieved])).toEqual([['streak-4', true], ['streak-8', false]])
  })

  it('has nothing reached before the first scan', () => {
    expect(buildMilestones({ ...base, scanTimes: [], products: [], bestStreak: 0, currentStreak: 0 }).every((m) => !m.achieved)).toBe(true)
  })
})

describe('newMilestones', () => {
  const now = at(40)
  const list = buildMilestones({
    scanTimes: [now - 2 * DAY_MS],
    products: [{ name: 'Cleanser', startDate: now - 60 * DAY_MS }], // reached 32 days ago
    firstWorking: { createdAt: now - 3 * DAY_MS, productName: 'Cleanser' },
    bestStreak: 4,
    currentStreak: 4,
    now,
  })

  it('celebrates only recent, unseen milestones, and streak goals exactly when reached', () => {
    expect(newMilestones(list, new Set(), now, 4).map((m) => m.id).sort()).toEqual(['first-scan', 'first-working', 'streak-4'])
    // streak goal no longer celebrated once the streak is past it
    expect(newMilestones(list, new Set(), now, 5).map((m) => m.id)).not.toContain('streak-4')
  })

  it('never repeats what has been seen, and never celebrates old news', () => {
    const seen = new Set(['first-working', 'first-scan'])
    expect(newMilestones(list, seen, now, 4).map((m) => m.id)).toEqual(['streak-4'])
    expect(newMilestones(list, new Set(), now, 4).map((m) => m.id)).not.toContain('product-days')
  })
})

describe('celebrationText', () => {
  it('is honest: data from your own scans, no promises', () => {
    const text = celebrationText({ id: 'first-working', title: 'x', achieved: true, achievedAt: 1, detail: 'Cleanser' })
    expect(text.text).toContain('real data from your own scans')
    expect(text.text).toContain('Cleanser')
    for (const id of ['first-scan', 'first-working', 'product-days', 'streak-4']) {
      const t = celebrationText({ id, title: 'T', achieved: true, achievedAt: 1 })
      expect(t.title + t.text).not.toMatch(/guarantee|prove|confirm|cured?|fixed/i)
    }
  })
})

describe('buildWeeklyScanIcs', () => {
  const ics = buildWeeklyScanIcs({ date: { year: 2026, month: 11, day: 6 }, uid: 'abc-123', createdAt: new Date(Date.UTC(2026, 9, 30, 12, 0, 5)), appUrl: 'https://skinify.test/' })

  it('is a valid-looking calendar with one weekly all-day event', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics).toContain('\r\nDTSTART;VALUE=DATE:20261106\r\n')
    expect(ics).toContain('\r\nRRULE:FREQ=WEEKLY\r\n')
    expect(ics).toContain('\r\nDTSTAMP:20261030T120005Z\r\n')
    expect(ics).toContain('\r\nUID:abc-123@skinify\r\n')
    expect(ics).toContain('SUMMARY:Weekly skin scan (Skinify)')
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1)
  })

  it('uses CRLF everywhere, never a bare newline, and keeps lines to 75 bytes', () => {
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
  })

  it('escapes the description and has no photos or scores in it', () => {
    const unfolded = ics.replace(/\r\n /g, '') // long lines are folded, so join them before reading
    expect(unfolded).toContain('DESCRIPTION:Two quick photos\\, taken back to back in the same light.\\nScan: https://skinify.test/scan')
    expect(unfolded).not.toMatch(/acne|score/i)
  })
})

describe('foldLine', () => {
  it('leaves short lines alone and folds long ones with a leading space, losing nothing', () => {
    expect(foldLine('SHORT:line')).toBe('SHORT:line')
    const long = `DESCRIPTION:${'é'.repeat(80)}`
    const folded = foldLine(long)
    expect(folded.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true)
    expect(folded.replace(/\r\n /g, '')).toBe(long)
  })
})

describe('escapeText', () => {
  it('escapes backslashes, semicolons, commas and newlines as iCalendar requires', () => {
    expect(escapeText('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne')
  })
})
