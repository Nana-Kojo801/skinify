import { useClerk } from '@clerk/react'
import { FileText, SignOut, Trash, ShieldCheck } from '@phosphor-icons/react'
import { useAction, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { ReminderSettings } from './components/reminder-settings'
import { Link } from 'react-router'
import { SettingsGroup, SettingsRowContent, rowClass } from '@/components/settings-row'
import { Alert } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogMedia, AlertDialogTitle } from '@/components/ui/alert-dialog'
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
    <main className="screen settings-page">
      <header className="screen-heading"><h1>Your account</h1></header>
      <div className="account-layout"><aside className="account-profile"><Avatar className="profile-avatar"><AvatarFallback className="text-inherit">{initial}</AvatarFallback></Avatar><div><h2>{me?.isDemoAccount ? 'Demo account' : 'Personal account'}</h2><p>{me?.email ?? 'Loading…'}</p></div><button type="button" onClick={() => void signOut()} className="profile-signout"><SignOut size={17} />Sign out</button></aside><div className="account-settings">
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

      <p className="rise px-2 pb-2 text-center text-xs text-ink-2">Scores are estimates from photos, not a medical assessment.</p>

      <p className="privacy-strip"><ShieldCheck size={18} />Photos are never stored.</p>
      </div></div>
      <AlertDialog open={confirming} onOpenChange={open => { if (!pending) setConfirming(open) }}>
        <AlertDialogContent>
          <AlertDialogMedia><Trash size={26} /></AlertDialogMedia>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>Deletes your account, products, scan scores and verdicts. Photos are never stored, so there is nothing else to remove. This cannot be undone.</AlertDialogDescription>
          {error && <Alert role="alert" variant="destructive" className="mt-3 font-semibold">{error}</Alert>}
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => void onDelete()} disabled={pending}>{pending ? 'Deleting…' : 'Yes, delete everything'}</AlertDialogAction>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
