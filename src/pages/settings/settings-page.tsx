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
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-5 pt-8 pb-20 md:px-8 md:pt-14">
      <div>
        <h1 className="heading text-5xl md:text-6xl">
          <strong>Settings</strong>
        </h1>
        {me && <p className="mt-3 text-lg text-white/75">Signed in as {me.email}</p>}
      </div>

      <section className="panel flex flex-col gap-4 p-6 md:p-8">
        <h2 className="text-2xl font-light">
          Your <strong className="font-bold">data</strong>
        </h2>
        {me?.isDemoAccount ? (
          <p className="text-white/75">
            This is the shared demo account, so it can't be deleted. Sign out and create your own account to try the app with your own
            products.
          </p>
        ) : (
          <>
            <p className="max-w-xl text-white/75">
              Deletes your account, products, scan scores and verdicts. Photos are never stored, so there is nothing else to remove. This
              cannot be undone.
            </p>
            {confirming ? (
              <div className="flex flex-col gap-3">
                <p className="font-medium">Are you sure?</p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="destructive" size="lg" onClick={onDelete} disabled={pending}>
                    {pending ? 'Deleting…' : 'Yes, delete everything'}
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => setConfirming(false)} disabled={pending}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="destructive" size="lg" className="self-start" onClick={() => setConfirming(true)} disabled={!me}>
                Delete my account and data
              </Button>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  )
}
