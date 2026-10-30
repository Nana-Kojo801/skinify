import { BellRinging, CaretDown, EnvelopeSimple } from '@phosphor-icons/react'
import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { REMINDER_CONFIG } from '@shared/reminders/reminder-config'
import { SettingsGroup, SettingsRowContent, rowClass } from '@/components/settings-row'
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

  const caption = (
    <>
      <p>
        {status.canRemind
          ? `We email ${status.email} at ${REMINDER_CONFIG.hourLocal}:00 the day before your weekly scan is due, and again if you miss it, up to ${REMINDER_CONFIG.maxRemindersPerScan} times. Scan early and the reminder moves with you. Every email has an unsubscribe link.`
          : 'Reminders cannot be sent to this email address.'}
      </p>
      {error && (
        <p role="alert" className="mt-2 rounded-2xl bg-irritation-bg px-4 py-3 text-sm font-semibold text-irritation-ink">
          {error}
        </p>
      )}
      {status.optedIn && status.paused && (
        <p className="mt-2 rounded-2xl bg-well px-4 py-3 text-sm text-ink-2">
          We stopped after {REMINDER_CONFIG.maxRemindersPerScan} reminders with no scan. Switch the reminder off and on again to restart.
        </p>
      )}
      {status.optedIn && status.delivery === 'preview' && (
        <p className="mt-2 rounded-2xl bg-well px-4 py-3 text-sm text-ink-2">
          Real email is limited to a few addresses while Receipts is a hackathon project, so yours won't be sent. This is what it would look like.
        </p>
      )}
    </>
  )

  return (
    <SettingsGroup title="Reminders" caption={caption} className="rise" >
      <div className="flex min-h-[62px] items-center gap-3.5 px-4 py-3">
        <SettingsRowContent
          icon={<BellRinging size={18} weight="bold" />}
          tint="bg-accent-2"
          label="Email me a reminder"
          sub="The day before your weekly scan"
          right={
            <button
              type="button"
              role="switch"
              aria-checked={status.optedIn}
              aria-label="Email me a reminder"
              disabled={pending || (!status.canRemind && !status.optedIn)}
              onClick={() => void toggle()}
              className="switch"
            />
          }
        />
      </div>
      {status.canRemind && (
        <>
          <button type="button" onClick={() => setShowPreview((open) => !open)} className={rowClass} aria-expanded={showPreview}>
            <SettingsRowContent
              icon={<EnvelopeSimple size={18} weight="bold" />}
              tint="bg-well"
              label={showPreview ? 'Hide the email' : 'Preview the email'}
              right={<CaretDown size={18} weight="bold" className={cn('shrink-0 text-ink-3 transition-transform duration-500 ease-(--ease-spring)', showPreview && 'rotate-180')} aria-hidden />}
            />
          </button>
          {showPreview && preview && (
            <div className="px-3.5 pb-3.5">
              <iframe title="Reminder email preview" srcDoc={preview.html} sandbox="" className="pop-in h-[24rem] w-full rounded-[18px] bg-white shadow-[inset_0_0_0_1px_var(--color-hair)] md:h-[28rem]" />
            </div>
          )}
        </>
      )}
    </SettingsGroup>
  )
}
