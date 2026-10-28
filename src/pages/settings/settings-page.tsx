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
    <main className="mx-auto max-w-md p-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      {me && <p className="mb-6 text-sm text-neutral-500">Signed in as {me.email}</p>}

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Your data</h2>
        {me?.isDemoAccount ? (
          <p className="text-sm text-neutral-500">
            This is the shared demo account, so it can't be deleted. Sign out and create your own account to try the app
            with your own products.
          </p>
        ) : (
          <>
            <p className="text-sm text-neutral-500">
              Deletes your account, products, scan scores and verdicts. Photos are never stored, so there is nothing else to
              remove. This cannot be undone.
            </p>
            {confirming ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Are you sure?</p>
                <Button variant="destructive" onClick={onDelete} disabled={pending}>
                  {pending ? 'Deleting…' : 'Yes, delete everything'}
                </Button>
                <Button variant="outline" onClick={() => setConfirming(false)} disabled={pending}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="destructive" onClick={() => setConfirming(true)} disabled={!me}>
                Delete my account and data
              </Button>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  )
}
