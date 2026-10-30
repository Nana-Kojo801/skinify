import { BellRinging } from '@phosphor-icons/react'
import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { REMINDER_CONFIG } from '@shared/reminders/reminder-config'
import { cn } from '@/lib/utils'
import { api } from '../../../../convex/_generated/api'

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone

// The "Email me a reminder" switch (off until someone turns it on) and a preview of the email.
export function ReminderSettings() {
  const status = useQuery(api.reminders.status)
  const setOptIn = useMutation(api.reminders.setOptIn)
  const [showPreview, setShowPreview] = useState(false)
  const preview = useQuery(api.reminders.preview, showPreview ? { timeZone: timeZone() } : 'skip')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The demo account never gets email, so it doesn't see the switch.
  if (!status || status.isDemoAccount) return null

  async function toggle() {
    if (!status) return
    setError(null)
    setPending(true)
    try {
      await setOptIn({ enabled: !status.optedIn, timeZone: timeZone() })
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data.message) : 'Could not change the setting. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="card rise p-5 md:p-6" style={{ '--i': 3 } as React.CSSProperties}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BellRinging size={20} />
            Email me a reminder
          </h2>
          <p className="mt-2 max-w-xl text-[15px] text-muted">
            {status.canRemind
              ? `We email ${status.email} at ${REMINDER_CONFIG.hourLocal}:00 the day before your weekly scan is due, and again if you miss it, up to ${REMINDER_CONFIG.maxRemindersPerScan} times. Scan early and the reminder moves with you. Every email has an unsubscribe link.`
              : 'Reminders cannot be sent to this email address.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={status.optedIn}
          aria-label="Email me a reminder"
          disabled={pending || (!status.canRemind && !status.optedIn)}
          onClick={() => void toggle()}
          className={cn(
            'relative mt-1 h-8 w-14 shrink-0 cursor-pointer rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45',
            status.optedIn ? 'bg-cocoa' : 'bg-nude',
          )}
        >
          <span
            aria-hidden
            className={cn('absolute top-1 left-1 size-6 rounded-full bg-card shadow transition-transform', status.optedIn && 'translate-x-6')}
          />
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-irritation-bg px-4 py-3 text-sm text-irritation-ink">
          {error}
        </p>
      )}
      {status.optedIn && status.paused && (
        <p className="mt-3 rounded-2xl bg-sand px-4 py-3 text-sm text-cocoa-soft">
          We stopped after {REMINDER_CONFIG.maxRemindersPerScan} reminders with no scan. Switch the reminder off and on again to restart.
        </p>
      )}
      {status.optedIn && status.delivery === 'preview' && (
        <p className="mt-3 rounded-2xl bg-sand px-4 py-3 text-sm text-cocoa-soft">
          Real email is limited to a few addresses while Receipts is a hackathon project, so yours won't be sent. This is what it would look like.
        </p>
      )}

      {status.canRemind && (
        <>
          <button type="button" onClick={() => setShowPreview((open) => !open)} className="mt-4 cursor-pointer text-sm font-semibold underline">
            {showPreview ? 'Hide the email' : 'Preview the email'}
          </button>
          {showPreview && preview && (
            <iframe title="Reminder email preview" srcDoc={preview.html} sandbox="" className="mt-3 h-[22rem] w-full rounded-2xl bg-white md:h-[26rem]" />
          )}
        </>
      )}
    </section>
  )
}
