import { useAuthActions } from '@convex-dev/auth/react'
import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '../../../convex/_generated/api'

export function SettingsPage() {
  const me = useQuery(api.account.me)
  const deleteMyAccount = useMutation(api.account.deleteMyAccount)
  const { signOut } = useAuthActions()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDelete() {
    setError(null)
    setPending(true)
    try {
      await deleteMyAccount()
      await signOut()
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data.message) : 'Could not delete the account. Try again.')
      setPending(false)
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-4 pb-12 md:max-w-xl">
      <div>
        <h1 className="display">
          <strong>Settings</strong>
        </h1>
        {me && <p className="mt-1 text-sm text-muted-foreground">Signed in as {me.email}</p>}
      </div>

      <section className="surface flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold tracking-tight">Your data</h2>
        {me?.isDemoAccount ? (
          <p className="text-sm text-muted-foreground">
            This is the shared demo account, so it can't be deleted. Sign out and create your own account to try the app with your own
            products.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Deletes your account, products, scan scores and verdicts. Photos are never stored, so there is nothing else to remove. This
              cannot be undone.
            </p>
            {confirming ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Are you sure?</p>
                <Button variant="destructive" size="lg" onClick={onDelete} disabled={pending}>
                  {pending ? 'Deleting…' : 'Yes, delete everything'}
                </Button>
                <Button variant="outline" size="lg" onClick={() => setConfirming(false)} disabled={pending}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="destructive" size="lg" onClick={() => setConfirming(true)} disabled={!me}>
                Delete my account and data
              </Button>
            )}
            {error && (
              <p role="alert" className="text-sm font-medium text-red-700">
                {error}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  )
}
