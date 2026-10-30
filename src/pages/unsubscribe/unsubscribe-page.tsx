import { CheckCircle, Warning } from '@phosphor-icons/react'
import { useMutation } from 'convex/react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Logo } from '@/components/logo'
import { buttonVariants } from '@/components/ui/button'
import { api } from '../../../convex/_generated/api'

type Result = 'working' | 'done' | 'failed'

// The unsubscribe link in every reminder email. The secret in the link is the only credential, so no sign-in.
export function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const unsubscribe = useMutation(api.reminders.unsubscribe)
  const [result, setResult] = useState<Result>('working')

  useEffect(() => {
    let cancelled = false
    unsubscribe({ token })
      .then(({ ok }) => {
        if (!cancelled) setResult(ok ? 'done' : 'failed')
      })
      .catch(() => {
        if (!cancelled) setResult('failed')
      })
    return () => {
      cancelled = true
    }
  }, [token, unsubscribe])

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <Logo />
      {result === 'working' && <p className="text-muted">One moment…</p>}
      {result === 'done' && (
        <>
          <CheckCircle size={44} weight="fill" className="text-working-ink" />
          <h1 className="text-2xl font-semibold">You're unsubscribed</h1>
          <p className="text-muted">We won't email you scan reminders any more. You can turn them back on in Settings.</p>
        </>
      )}
      {result === 'failed' && (
        <>
          <Warning size={44} className="text-irritation-ink" />
          <h1 className="text-2xl font-semibold">This link didn't work</h1>
          <p className="text-muted">It may be incomplete. Sign in and switch the reminder off in Settings instead.</p>
        </>
      )}
      <Link to="/" className={buttonVariants({ variant: 'soft', size: 'lg' })}>
        Open Receipts
      </Link>
    </main>
  )
}
