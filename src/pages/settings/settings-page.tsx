import { useClerk } from '@clerk/react'
import { FileText, SignOut, Trash } from '@phosphor-icons/react'
import { useAction, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ReminderSettings } from './components/reminder-settings'
import { Link } from 'react-router'
import { SettingsGroup, SettingsRowContent, rowClass } from '@/components/settings-row'
import { api } from '../../../convex/_generated/api'

export function SettingsPage() {
  const me = useQuery(api.account.me)
  const deleteMyAccount = useAction(api.account.deleteMyAccount)
  const { signOut } = useClerk()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDelete() {
    setError(null)
    setPending(true)
    try {
      await deleteMyAccount()
      // The Clerk login is already gone, so signing out may complain; either way we leave for the login page.
      await signOut().catch(() => undefined)
      window.location.assign('/login')
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data.message) : 'Could not delete the account. Try again.')
      setPending(false)
    }
  }

  const initial = me?.email?.charAt(0).toUpperCase() ?? ' '

  return (
    <main className="settings-page">
      <header className="settings-heading"><p className="kicker">THE DETAILS / YOUR SPACE</p><h1 className="editorial-title">Make it yours.</h1><p className="page-description">Your account, your rhythm, your data.</p></header>
      <div className="settings-layout"><aside className="settings-profile"><span className="profile-initial">{initial}</span><p className="kicker">SIGNED IN AS</p><p className="profile-email">{me?.email ?? 'Loading…'}</p><span className="profile-type">{me?.isDemoAccount ? 'Sample journal · Read only' : 'Your personal journal'}</span><div className="profile-note"><h2>A little space<br /><em>for your routine.</em></h2><p>Your scans keep the numbers. Your photos are never stored by Receipts.</p></div></aside><div className="settings-sections">
      <ReminderSettings />

      <SettingsGroup
        title="Report"
        className="rise"
        caption="A plain printable page with your products, their results and every scan as numbers, with a clear note that it is not a medical assessment. No photos, because none are stored."
      >
        <Link to="/report" aria-label="Open the report" className={rowClass}>
          <SettingsRowContent icon={<FileText size={18} weight="bold" />} tint="bg-early-bg" label="Open the report" sub="For a pharmacist or dermatologist" />
        </Link>
      </SettingsGroup>

      <SettingsGroup className="rise">
        <button type="button" onClick={() => void signOut()} className={rowClass}>
          <SettingsRowContent icon={<SignOut size={18} weight="bold" />} tint="bg-well" label="Sign out" right="none" />
        </button>
      </SettingsGroup>

      {me?.isDemoAccount ? (
        <SettingsGroup
          title="Your data"
          className="rise"
          caption="This is the shared demo account, so it can't be deleted. Sign out and create your own account to try the app with your own products."
        />
      ) : (
        <SettingsGroup
          title="Your data"
          className="rise"
          caption="Deletes your account, products, scan scores and verdicts. Photos are never stored, so there is nothing else to remove. This cannot be undone."
        >
          <button type="button" onClick={() => setConfirming(true)} disabled={!me} className={rowClass}>
            <SettingsRowContent icon={<Trash size={18} weight="bold" />} tint="bg-irritation-bg text-irritation-ink" label="Delete my account and data" right="none" danger />
          </button>
        </SettingsGroup>
      )}

      <p className="rise px-2 pb-2 text-center text-[13px] text-ink-2">Scores are estimates from photos, not a medical assessment.</p>

      </div></div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!pending) setConfirming(open)
        }}
        title="Are you sure?"
        description="Deletes your account, products, scan scores and verdicts. Photos are never stored, so there is nothing else to remove. This cannot be undone."
        confirmLabel="Yes, delete everything"
        pending={pending}
        error={error}
        onConfirm={() => void onDelete()}
      />
    </main>
  )
}
