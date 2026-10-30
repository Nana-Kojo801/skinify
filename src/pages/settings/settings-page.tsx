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
    <main className="mx-auto flex max-w-[680px] flex-col gap-6 px-3 pt-[max(12px,env(safe-area-inset-top))] md:gap-7 md:px-6 md:pt-12">
      <h1 className="display rise px-2 text-[40px] leading-none md:sr-only">Settings</h1>

      {/* Account: a row on phones, centred on desktop */}
      <section className="rise" style={{ '--i': 1 } as React.CSSProperties} aria-label="Account">
        <div className="tile flex items-center gap-3.5 rounded-[22px] px-4 py-3.5 md:hidden">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[image:var(--sheen)] bg-accent text-2xl font-extrabold shadow-(--shadow-depth-color)">{initial}</span>
          <span className="min-w-0">
            <span className="block text-[13px] text-ink-2">Signed in as</span>
            <span className="block truncate text-[17px] font-bold">{me?.email ?? ' '}</span>
          </span>
        </div>
        <div className="hidden flex-col items-center gap-2 text-center md:flex">
          <span className="pop-in grid size-[92px] place-items-center rounded-full bg-[image:var(--sheen)] bg-accent text-[40px] font-extrabold shadow-(--shadow-depth-color)">{initial}</span>
          <p className="mt-2 text-sm text-ink-2">Signed in as</p>
          <p className="display text-[28px] leading-tight">{me?.email ?? ' '}</p>
        </div>
      </section>

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
