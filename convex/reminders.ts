import { ConvexError, v } from 'convex/values'
import { buildReminderEmail, formatDueLabel } from '../shared/email/reminder-email'
import { isAllowedRecipient, isBlockedAddress } from '../shared/email/recipients'
import { sendEmail } from '../shared/email/send-email'
import { REMINDER_CONFIG } from '../shared/reminders/reminder-config'
import { decideReminder, isValidTimeZone, nextScanDueAt, safeTimeZone } from '../shared/reminders/reminder-schedule'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { internalAction, internalMutation, internalQuery, mutation, query, type QueryCtx } from './_generated/server'
import { getUserId, isDemoUser, rejectDemoUser, requireUserId } from './helpers'

const appUrl = () => (process.env.APP_URL ?? '').replace(/\/$/, '')
const unsubscribeUrl = (token: string) => `${appUrl()}/unsubscribe?token=${token}`

async function latestScanAt(ctx: QueryCtx, userId: Id<'users'>): Promise<number | null> {
  const scan = await ctx.db
    .query('scans')
    .withIndex('by_user_and_createdAt', (q) => q.eq('userId', userId))
    .order('desc')
    .first()
  return scan?.createdAt ?? null
}

/** Reminders already sent for the user's current latest scan (the count starts again after a new scan). */
const sentForScan = (user: Doc<'users'>, scanAt: number) => (user.reminderScanAt === scanAt ? (user.remindersSent ?? 0) : 0)

/** Settings and the Home / Scan pages: the reminder switch, and when the next scan is due. */
export const status = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (userId === null) return null
    const user = (await ctx.db.get(userId))!
    const scanAt = await latestScanAt(ctx, userId)
    const email = user.email ?? null
    return {
      isDemoAccount: await isDemoUser(ctx, userId),
      email,
      /** false for addresses we never email (no address, or a test domain). */
      canRemind: !isBlockedAddress(email),
      optedIn: user.reminderOptIn === true,
      /** 'live' = a real email will be sent; 'preview' = this address is not on the allow-list, show the preview only. */
      delivery: email && isAllowedRecipient(email, process.env.EMAIL_ALLOWED_TO) ? ('live' as const) : ('preview' as const),
      /** Reminders stopped after the maximum in a row with no scan. */
      paused: user.reminderOptIn === true && scanAt !== null && sentForScan(user, scanAt) >= REMINDER_CONFIG.maxRemindersPerScan,
      nextDueAt: scanAt === null ? null : nextScanDueAt(scanAt),
      timeZone: user.timeZone ?? null,
    }
  },
})

/** What the reminder email looks like, for the preview in Settings. */
export const preview = query({
  args: { timeZone: v.string() },
  handler: async (ctx, { timeZone }) => {
    const userId = await getUserId(ctx)
    if (userId === null) return null
    const zone = safeTimeZone(timeZone)
    const scanAt = await latestScanAt(ctx, userId)
    const dueAt = nextScanDueAt(scanAt ?? Date.now())
    return buildReminderEmail({
      dueLabel: formatDueLabel(dueAt, zone),
      appUrl: appUrl() || 'https://example.invalid',
      unsubscribeUrl: `${appUrl() || 'https://example.invalid'}/unsubscribe?token=preview`,
    })
  },
})

function randomToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** The "Email me a reminder" switch. Off until a person turns it on. */
export const setOptIn = mutation({
  args: { enabled: v.boolean(), timeZone: v.string() },
  handler: async (ctx, { enabled, timeZone }) => {
    const userId = await requireUserId(ctx)
    await rejectDemoUser(ctx, userId)
    const user = (await ctx.db.get(userId))!
    if (enabled && isBlockedAddress(user.email)) {
      throw new ConvexError({ code: 'INVALID_INPUT', message: 'Reminders cannot be sent to this email address.' })
    }
    await ctx.db.patch(userId, {
      reminderOptIn: enabled,
      timeZone: isValidTimeZone(timeZone) ? timeZone : REMINDER_CONFIG.fallbackTimeZone,
      unsubscribeToken: user.unsubscribeToken ?? randomToken(),
      // Switching back on starts the count again (it may have stopped after the maximum).
      ...(enabled ? { remindersSent: 0 } : {}),
    })
  },
})

/** The unsubscribe link in every email. The token is the only credential, so no sign-in is needed. */
export const unsubscribe = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (token.length < 16) return { ok: false }
    const user = await ctx.db.query('users').withIndex('by_unsubscribe_token', (q) => q.eq('unsubscribeToken', token)).unique()
    if (!user) return { ok: false }
    if (user.reminderOptIn) await ctx.db.patch(user._id, { reminderOptIn: false })
    return { ok: true }
  },
})

type DueReminder = { userId: Id<'users'>; email: string; scanAt: number; dueAt: number; timeZone: string; token: string; sent: number }

/** Everyone whose reminder should go out now. Pure reading: nothing is marked until the email was sent. */
export const dueNow = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, { now }): Promise<DueReminder[]> => {
    const due: DueReminder[] = []
    for (const user of await ctx.db.query('users').withIndex('by_reminder_opt_in', (q) => q.eq('reminderOptIn', true)).collect()) {
      if (!user.email || isBlockedAddress(user.email) || !user.unsubscribeToken) continue
      if (await isDemoUser(ctx, user._id)) continue
      const scanAt = await latestScanAt(ctx, user._id)
      if (scanAt === null) continue
      const sent = sentForScan(user, scanAt)
      const decision = decideReminder(
        { latestScanAt: scanAt, timeZone: user.timeZone, lastReminderDue: user.lastReminderDue, remindersSentForLatestScan: sent },
        now,
      )
      if (!decision.send) continue
      due.push({
        userId: user._id,
        email: user.email,
        scanAt,
        dueAt: decision.dueAt,
        timeZone: safeTimeZone(user.timeZone),
        token: user.unsubscribeToken,
        sent,
      })
    }
    return due
  },
})

export const markSent = internalMutation({
  args: { userId: v.id('users'), scanAt: v.number(), dueAt: v.number(), sent: v.number() },
  handler: async (ctx, { userId, scanAt, dueAt, sent }) => {
    await ctx.db.patch(userId, { reminderScanAt: scanAt, remindersSent: sent + 1, lastReminderDue: dueAt })
  },
})

/**
 * Hourly cron. Sends each due reminder once and records it. Real emails go only to addresses on EMAIL_ALLOWED_TO
 * (see shared/email/recipients.ts); everyone else only sees the preview in Settings. A failed send is left unmarked
 * and tried again next hour (the idempotency key stops a double send if Resend did get the first one).
 */
export const sendDueReminders = internalAction({
  args: {},
  handler: async (ctx): Promise<{ sent: number; skipped: number; failed: number }> => {
    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.EMAIL_FROM
    const base = appUrl()
    const result = { sent: 0, skipped: 0, failed: 0 }
    if (!apiKey || !from || !base) return result // not set up yet: nothing to do

    for (const reminder of await ctx.runQuery(internal.reminders.dueNow, { now: Date.now() })) {
      if (!isAllowedRecipient(reminder.email, process.env.EMAIL_ALLOWED_TO)) {
        result.skipped++
        continue
      }
      const message = buildReminderEmail({
        dueLabel: formatDueLabel(reminder.dueAt, reminder.timeZone),
        appUrl: base,
        unsubscribeUrl: unsubscribeUrl(reminder.token),
      })
      try {
        await sendEmail(
          { to: reminder.email, ...message },
          { apiKey, from, idempotencyKey: `scan-reminder-${reminder.userId}-${reminder.dueAt}` },
        )
      } catch (error) {
        result.failed++
        console.error('Reminder email failed', error instanceof Error ? error.message : String(error))
        continue
      }
      await ctx.runMutation(internal.reminders.markSent, {
        userId: reminder.userId,
        scanAt: reminder.scanAt,
        dueAt: reminder.dueAt,
        sent: reminder.sent,
      })
      result.sent++
    }
    return result
  },
})
