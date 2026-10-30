// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '../convex/_generated/api'
import schema from '../convex/schema'
import { DEMO_EMAIL } from '../shared/demo-account'
import { buildReminderEmail } from '../shared/email/reminder-email'
import { isAllowedRecipient, isBlockedAddress } from '../shared/email/recipients'
import { DAY_MS } from '../shared/reminders/reminder-config'
import { decideReminder, reminderTimeFor } from '../shared/reminders/reminder-schedule'
import { clerkIdFor } from './helpers/clerk-id'

const modules = import.meta.glob('../convex/**/*.ts')
const HOUR = 3_600_000

describe('reminderTimeFor', () => {
  // Due Fri 6 Nov 2026 14:30 UTC.
  const due = Date.UTC(2026, 10, 6, 14, 30)

  it('is 9:00 local on the day before the due date', () => {
    expect(new Date(reminderTimeFor(due, 'UTC')).toISOString()).toBe('2026-11-05T09:00:00.000Z')
    // New York is UTC-5 in November (standard time): 9:00 there is 14:00 UTC.
    expect(new Date(reminderTimeFor(due, 'America/New_York')).toISOString()).toBe('2026-11-05T14:00:00.000Z')
    // India is UTC+5:30 all year.
    expect(new Date(reminderTimeFor(due, 'Asia/Kolkata')).toISOString()).toBe('2026-11-05T03:30:00.000Z')
  })

  it('uses the local calendar day, so a due time just after local midnight is still "the day before" locally', () => {
    // 2026-11-06 02:00 UTC is still Thu 5 Nov 21:00 in New York, so the day before there is Wed 4 Nov.
    expect(new Date(reminderTimeFor(Date.UTC(2026, 10, 6, 2, 0), 'America/New_York')).toISOString()).toBe('2026-11-04T14:00:00.000Z')
  })

  it('follows daylight saving: 9:00 local before and after the clocks change', () => {
    // US clocks go back at 02:00 on Sun 1 Nov 2026, so 9:00 on 1 Nov is already standard time (UTC-5).
    expect(new Date(reminderTimeFor(Date.UTC(2026, 10, 2, 18, 0), 'America/New_York')).toISOString()).toBe('2026-11-01T14:00:00.000Z')
    // The day before that is still summer time (UTC-4).
    expect(new Date(reminderTimeFor(Date.UTC(2026, 9, 31, 18, 0), 'America/New_York')).toISOString()).toBe('2026-10-30T13:00:00.000Z')
  })

  it('falls back to UTC for an unknown time zone', () => {
    expect(reminderTimeFor(due, 'Not/AZone')).toBe(reminderTimeFor(due, 'UTC'))
  })
})

describe('decideReminder', () => {
  const scan = Date.UTC(2026, 10, 1, 10, 0) // due Sun 8 Nov 10:00 UTC; reminder Sat 7 Nov 09:00 UTC
  const base = { latestScanAt: scan, timeZone: 'UTC', lastReminderDue: undefined, remindersSentForLatestScan: 0 }
  const reminderAt = Date.UTC(2026, 10, 7, 9, 0)
  const dueAt = scan + 7 * DAY_MS

  it('waits until the reminder time, then sends, until the scan is due', () => {
    expect(decideReminder(base, reminderAt - 1).send).toBe(false)
    expect(decideReminder(base, reminderAt)).toEqual({ send: true, dueAt, reminderAt })
    expect(decideReminder(base, dueAt - 1).send).toBe(true)
  })

  it('sends once per due date', () => {
    expect(decideReminder({ ...base, lastReminderDue: dueAt }, reminderAt + HOUR).send).toBe(false)
  })

  it('moves to the next weekly slot when the due date passes without a scan', () => {
    const next = decideReminder({ ...base, lastReminderDue: dueAt, remindersSentForLatestScan: 1 }, Date.UTC(2026, 10, 14, 9, 0))
    expect(next).toMatchObject({ send: true, dueAt: dueAt + 7 * DAY_MS })
  })

  it('stops after the maximum number of ignored reminders', () => {
    expect(decideReminder({ ...base, remindersSentForLatestScan: 3 }, reminderAt + HOUR).send).toBe(false)
  })

  it('a newer scan moves the due date: the old slot is no longer due', () => {
    const early = { ...base, latestScanAt: scan + 3 * DAY_MS } // scanned 3 days later
    expect(decideReminder(early, reminderAt + HOUR).send).toBe(false)
    expect(decideReminder(early, early.latestScanAt + 6 * DAY_MS + 12 * HOUR).send).toBe(true)
  })
})

describe('recipients', () => {
  it('blocks missing addresses and test domains, including subdomains', () => {
    for (const email of [null, undefined, '', 'nope', 'a@example.com', 'a@EXAMPLE.org', 'a@mail.example.net', 'a@x.test', 'a@localhost']) {
      expect(isBlockedAddress(email)).toBe(true)
    }
    expect(isBlockedAddress('nana@gmail.com')).toBe(false)
    expect(isBlockedAddress('a@notexample.com')).toBe(false)
  })

  it('allows nobody unless EMAIL_ALLOWED_TO says so', () => {
    expect(isAllowedRecipient('nana@gmail.com', undefined)).toBe(false)
    expect(isAllowedRecipient('nana@gmail.com', '')).toBe(false)
    expect(isAllowedRecipient('Nana@Gmail.com', 'other@x.com, nana@gmail.com')).toBe(true)
    expect(isAllowedRecipient('x@y.com', 'nana@gmail.com')).toBe(false)
    expect(isAllowedRecipient('x@y.com', '*')).toBe(true)
  })
})

describe('buildReminderEmail', () => {
  it('has the due date, a scan link, why it was sent and an unsubscribe link, and escapes its inputs', () => {
    const email = buildReminderEmail({ dueLabel: 'Fri, Nov 6', appUrl: 'https://app.test/', unsubscribeUrl: 'https://app.test/unsubscribe?token=abc&x=<b>' })
    expect(email.subject).toBe('Time for your weekly scan')
    expect(email.text).toContain('Fri, Nov 6')
    expect(email.text).toContain('https://app.test/scan')
    expect(email.text).toContain('You are getting this because you turned on scan reminders')
    expect(email.text).toContain('unsubscribe?token=abc')
    expect(email.html).toContain('href="https://app.test/scan"')
    expect(email.html).toContain('token=abc&amp;x=&lt;b&gt;')
    expect(email.html).not.toContain('<b>')
  })
})

// ---- Convex functions ----

const NOW = Date.UTC(2026, 10, 7, 9, 30) // Sat 7 Nov 2026, 09:30 UTC
/** The last scan: 6 days and 20 hours before NOW, so it is due about 4 hours after NOW and the reminder time (9:00 UTC) has passed. */
const SCAN_AT = NOW - 6 * DAY_MS - 20 * HOUR

async function setup(email = 'nana@gmail.com') {
  const t = convexTest(schema, modules)
  const clerkId = clerkIdFor(email)
  const userId = await t.run((ctx) => ctx.db.insert('users', { email, clerkId }))
  return { t, userId, me: t.withIdentity({ subject: clerkId }) }
}

async function addScan(t: Awaited<ReturnType<typeof setup>>['t'], userId: string, createdAt: number) {
  await t.run((ctx) =>
    ctx.db.insert('scans', { userId: userId as never, createdAt, scores: { acne: 50 }, noise: { acne: 1 }, qualityFlag: false }),
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  vi.stubEnv('RESEND_API_KEY', 're_test_key')
  vi.stubEnv('EMAIL_FROM', 'Receipts <onboarding@resend.dev>')
  vi.stubEnv('APP_URL', 'https://receipts.test')
  vi.stubEnv('EMAIL_ALLOWED_TO', 'nana@gmail.com')
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const ok = () => new Response(JSON.stringify({ id: 'email_1' }), { status: 200 })

describe('reminders.setOptIn and status', () => {
  it('is off by default and shows when the next scan is due', async () => {
    const { t, userId, me } = await setup()
    await addScan(t, userId, SCAN_AT)
    expect(await me.query(api.reminders.status, {})).toMatchObject({
      optedIn: false,
      canRemind: true,
      delivery: 'live',
      paused: false,
      nextDueAt: SCAN_AT + 7 * DAY_MS,
    })
  })

  it('turns on with the time zone and an unsubscribe token, and off again', async () => {
    const { t, userId, me } = await setup()
    await me.mutation(api.reminders.setOptIn, { enabled: true, timeZone: 'Africa/Accra' })
    let user = (await t.run((ctx) => ctx.db.get(userId)))!
    expect(user).toMatchObject({ reminderOptIn: true, timeZone: 'Africa/Accra' })
    expect(user.unsubscribeToken).toMatch(/^[0-9a-f]{48}$/)
    const token = user.unsubscribeToken
    await me.mutation(api.reminders.setOptIn, { enabled: false, timeZone: 'Africa/Accra' })
    user = (await t.run((ctx) => ctx.db.get(userId)))!
    expect(user.reminderOptIn).toBe(false)
    expect(user.unsubscribeToken).toBe(token)
  })

  it('stores UTC for a bogus time zone', async () => {
    const { t, userId, me } = await setup()
    await me.mutation(api.reminders.setOptIn, { enabled: true, timeZone: 'Mars/Olympus' })
    expect((await t.run((ctx) => ctx.db.get(userId)))?.timeZone).toBe('UTC')
  })

  it('refuses the demo account and test-domain addresses', async () => {
    const demo = await setup(DEMO_EMAIL)
    await expect(demo.me.mutation(api.reminders.setOptIn, { enabled: true, timeZone: 'UTC' })).rejects.toMatchObject({ data: { code: 'DEMO_ACCOUNT' } })
    const test = await setup('tester@example.org')
    await expect(test.me.mutation(api.reminders.setOptIn, { enabled: true, timeZone: 'UTC' })).rejects.toMatchObject({ data: { code: 'INVALID_INPUT' } })
  })

  it('reports "preview" for addresses that are not on the allow-list', async () => {
    const { me } = await setup('someone@gmail.com')
    expect(await me.query(api.reminders.status, {})).toMatchObject({ delivery: 'preview' })
  })

  it('requires sign-in', async () => {
    const t = convexTest(schema, modules)
    expect(await t.query(api.reminders.status, {})).toBeNull()
    await expect(t.mutation(api.reminders.setOptIn, { enabled: true, timeZone: 'UTC' })).rejects.toMatchObject({ data: { code: 'NOT_AUTHENTICATED' } })
  })
})

describe('reminders.sendDueReminders', () => {
  async function optedIn(email = 'nana@gmail.com', scanAt = SCAN_AT) {
    const s = await setup(email)
    await addScan(s.t, s.userId, scanAt)
    await s.me.mutation(api.reminders.setOptIn, { enabled: true, timeZone: 'UTC' })
    return s
  }

  it('sends one email per due date, with no scores in it, and not again', async () => {
    const fetchMock = vi.fn(async () => ok())
    vi.stubGlobal('fetch', fetchMock)
    const { t, userId } = await optedIn()
    expect(await t.action(internal.reminders.sendDueReminders, {})).toEqual({ sent: 1, skipped: 0, failed: 0 })
    expect(await t.action(internal.reminders.sendDueReminders, {})).toEqual({ sent: 0, skipped: 0, failed: 0 })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer re_test_key')
    expect(headers['Idempotency-Key']).toBe(`scan-reminder-${userId}-${SCAN_AT + 7 * DAY_MS}`)
    const body = JSON.parse(init.body as string)
    expect(body).toMatchObject({ from: 'Receipts <onboarding@resend.dev>', to: 'nana@gmail.com', subject: 'Time for your weekly scan' })
    expect(body.text).toContain('https://receipts.test/scan')
    expect(body.text).toMatch(/https:\/\/receipts\.test\/unsubscribe\?token=[0-9a-f]{48}/)
    expect(body.text + body.html).not.toMatch(/acne|score|redness/i)
  })

  it('does not send before the reminder time', async () => {
    const fetchMock = vi.fn(async () => ok())
    vi.stubGlobal('fetch', fetchMock)
    const { t } = await optedIn('nana@gmail.com', NOW - 2 * DAY_MS)
    expect(await t.action(internal.reminders.sendDueReminders, {})).toEqual({ sent: 0, skipped: 0, failed: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('moves with the user: scanning early pushes the reminder out', async () => {
    const fetchMock = vi.fn(async () => ok())
    vi.stubGlobal('fetch', fetchMock)
    const { t, userId } = await optedIn()
    await addScan(t, userId, NOW - HOUR) // scanned an hour ago, so the next one is due in 7 days
    expect(await t.action(internal.reminders.sendDueReminders, {})).toEqual({ sent: 0, skipped: 0, failed: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
    // ...and a week later the new due date is the one reminded about.
    vi.setSystemTime(NOW - HOUR + 6 * DAY_MS + 23 * HOUR)
    expect(await t.action(internal.reminders.sendDueReminders, {})).toEqual({ sent: 1, skipped: 0, failed: 0 })
    const key = ((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>)['Idempotency-Key']
    expect(key).toBe(`scan-reminder-${userId}-${NOW - HOUR + 7 * DAY_MS}`)
  })

  it('never emails: opted out, no scans, the demo, test domains, unsubscribed', async () => {
    const fetchMock = vi.fn(async () => ok())
    vi.stubGlobal('fetch', fetchMock)
    const { t } = await setup('off@gmail.com') // never opted in
    const noScans = await setup('noscan@gmail.com')
    await noScans.me.mutation(api.reminders.setOptIn, { enabled: true, timeZone: 'UTC' })
    // The demo and a test-domain user are forced into the opted-in state directly, as if they had got there some other way.
    const demoId = await t.run((ctx) => ctx.db.insert('users', { email: DEMO_EMAIL, clerkId: 'u_demo', reminderOptIn: true, unsubscribeToken: 'a'.repeat(48) }))
    const testId = await t.run((ctx) => ctx.db.insert('users', { email: 'qa@example.com', clerkId: 'u_qa', reminderOptIn: true, unsubscribeToken: 'b'.repeat(48) }))
    await addScan(t, demoId, SCAN_AT)
    await addScan(t, testId, SCAN_AT)
    const quit = await optedIn('quit@gmail.com')
    const token = (await quit.t.run((ctx) => ctx.db.get(quit.userId)))!.unsubscribeToken!
    expect(await t.mutation(api.reminders.unsubscribe, { token })).toEqual({ ok: false }) // `t` is another database: the token is unknown there
    expect(await quit.t.mutation(api.reminders.unsubscribe, { token })).toEqual({ ok: true })

    expect(await t.action(internal.reminders.sendDueReminders, {})).toEqual({ sent: 0, skipped: 0, failed: 0 })
    expect(await quit.t.action(internal.reminders.sendDueReminders, {})).toEqual({ sent: 0, skipped: 0, failed: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('skips addresses that are not on the allow-list, and does nothing without a key or app url', async () => {
    const fetchMock = vi.fn(async () => ok())
    vi.stubGlobal('fetch', fetchMock)
    const { t } = await optedIn('stranger@gmail.com')
    expect(await t.action(internal.reminders.sendDueReminders, {})).toEqual({ sent: 0, skipped: 1, failed: 0 })
    vi.stubEnv('EMAIL_ALLOWED_TO', '*')
    vi.stubEnv('RESEND_API_KEY', '')
    expect(await t.action(internal.reminders.sendDueReminders, {})).toEqual({ sent: 0, skipped: 0, failed: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('stops after three ignored reminders, and starts again when switched back on', async () => {
    const fetchMock = vi.fn(async () => ok())
    vi.stubGlobal('fetch', fetchMock)
    const { t, me } = await optedIn()
    for (let week = 0; week < 5; week++) {
      vi.setSystemTime(NOW + week * 7 * DAY_MS)
      await t.action(internal.reminders.sendDueReminders, {})
    }
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(await me.query(api.reminders.status, {})).toMatchObject({ paused: true })

    await me.mutation(api.reminders.setOptIn, { enabled: true, timeZone: 'UTC' })
    expect(await me.query(api.reminders.status, {})).toMatchObject({ paused: false })
    vi.setSystemTime(NOW + 5 * 7 * DAY_MS)
    await t.action(internal.reminders.sendDueReminders, {})
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('leaves a failed send unmarked so the next run tries again', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ message: 'nope' }), { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    const { t } = await optedIn()
    expect(await t.action(internal.reminders.sendDueReminders, {})).toEqual({ sent: 0, skipped: 0, failed: 1 })
    fetchMock.mockImplementation(async () => ok())
    expect(await t.action(internal.reminders.sendDueReminders, {})).toEqual({ sent: 1, skipped: 0, failed: 0 })
  })
})

describe('reminders.sendTestEmail', () => {
  it('sends the real email once to an allow-listed address, and refuses anyone else', async () => {
    const fetchMock = vi.fn(async () => ok())
    vi.stubGlobal('fetch', fetchMock)
    const t = convexTest(schema, modules)
    expect(await t.action(internal.reminders.sendTestEmail, { email: 'nana@gmail.com' })).toEqual({ id: 'email_1' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toMatchObject({ to: 'nana@gmail.com' })
    await expect(t.action(internal.reminders.sendTestEmail, { email: 'stranger@gmail.com' })).rejects.toThrow(/not on EMAIL_ALLOWED_TO/)
    await expect(t.action(internal.reminders.sendTestEmail, { email: 'a@example.com' })).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('reminders.unsubscribe', () => {
  it('turns reminders off from the link, repeatably, and rejects a wrong token', async () => {
    const { t, userId, me } = await setup()
    await me.mutation(api.reminders.setOptIn, { enabled: true, timeZone: 'UTC' })
    const token = (await t.run((ctx) => ctx.db.get(userId)))!.unsubscribeToken!
    expect(await t.mutation(api.reminders.unsubscribe, { token: 'f'.repeat(48) })).toEqual({ ok: false })
    expect(await t.mutation(api.reminders.unsubscribe, { token: 'short' })).toEqual({ ok: false })
    expect((await t.run((ctx) => ctx.db.get(userId)))?.reminderOptIn).toBe(true)
    expect(await t.mutation(api.reminders.unsubscribe, { token })).toEqual({ ok: true })
    expect(await t.mutation(api.reminders.unsubscribe, { token })).toEqual({ ok: true })
    expect((await t.run((ctx) => ctx.db.get(userId)))?.reminderOptIn).toBe(false)
  })
})

describe('reminders.preview', () => {
  it('shows the email for the signed-in user without any real token', async () => {
    const { t, userId, me } = await setup()
    await addScan(t, userId, SCAN_AT)
    const email = await me.query(api.reminders.preview, { timeZone: 'UTC' })
    expect(email?.subject).toBe('Time for your weekly scan')
    expect(email?.html).toContain('https://receipts.test/scan')
    expect(email?.html).toContain('token=preview')
  })
})

describe('account deletion', () => {
  it('removes the reminder data with the user row', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))
    vi.stubEnv('CLERK_SECRET_KEY', 'sk_test')
    const { t, userId, me } = await setup()
    await me.mutation(api.reminders.setOptIn, { enabled: true, timeZone: 'UTC' })
    await me.action(api.account.deleteMyAccount, {})
    expect(await t.run((ctx) => ctx.db.get(userId))).toBeNull()
  })
})
