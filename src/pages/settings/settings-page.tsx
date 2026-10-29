import { useClerk } from '@clerk/react'
import { LockSimple, SignOut, Sparkle, Trash } from '@phosphor-icons/react'
import { useAction, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
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

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-3.5 px-4 pt-1.5 md:px-8 md:pt-12">
      <section className="rise mb-2 px-1">
        <p className="text-sm font-medium text-muted">Settings</p>
        <h1 className="mt-1 text-[36px] leading-[1.05] font-semibold tracking-[-0.035em] md:text-5xl">Your account</h1>
      </section>

      <section className="card rise flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6" style={{ '--i': 1 } as React.CSSProperties}>
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="grid size-[52px] shrink-0 place-items-center rounded-full bg-coral text-xl font-bold text-white uppercase shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_8px_16px_-8px_rgb(168_81_58/0.7)]">
            {me?.email?.charAt(0) ?? ' '}
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] text-muted">Signed in as</span>
            <span className="block truncate text-lg font-semibold">{me?.email ?? ' '}</span>
          </span>
        </div>
        <Button variant="soft" size="lg" onClick={() => void signOut()}>
          <SignOut size={19} />
          Sign out
        </Button>
      </section>

      <section className="photo rise relative h-40 overflow-hidden rounded-(--radius-card) md:h-48" style={{ '--i': 2 } as React.CSSProperties}>
        <img src="/images/dropper-skin.webp" alt="" className="size-full object-cover object-[50%_40%]" />
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 bg-linear-to-b from-transparent to-cocoa/75 px-5 pt-10 pb-4 text-white">
          <LockSimple size={24} className="mb-0.5 shrink-0" />
          <span>
            <span className="block text-lg font-semibold">Photos are never stored</span>
            <span className="block text-[13.5px] opacity-90">Each photo is analysed, then thrown away. Receipts keeps the scores and nothing else.</span>
          </span>
        </div>
      </section>

      <section className="card rise p-5 md:p-6" style={{ '--i': 3 } as React.CSSProperties}>
        <h2 className="text-lg font-semibold">Your data</h2>
        {me?.isDemoAccount ? (
          <p className="mt-2 flex items-start gap-2.5 text-[15px] text-muted">
            <Sparkle size={18} className="mt-0.5 shrink-0 text-coral-ink" />
            This is the shared demo account, so it can't be deleted. Sign out and create your own account to try the app with your own products.
          </p>
        ) : (
          <>
            <p className="mt-2 max-w-xl text-[15px] text-muted">
              Deletes your account, products, scan scores and verdicts. Photos are never stored, so there is nothing else to remove. This cannot be
              undone.
            </p>
            <Button variant="danger" size="lg" className="mt-4" onClick={() => setConfirming(true)} disabled={!me}>
              <Trash size={19} />
              Delete my account and data
            </Button>
          </>
        )}
      </section>

      <p className="rise px-1 pt-2 text-center text-[13px] text-muted" style={{ '--i': 4 } as React.CSSProperties}>
        Scores are estimates from photos, not a medical assessment.
      </p>

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
