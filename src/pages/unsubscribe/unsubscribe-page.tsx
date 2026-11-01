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
    <main className="relative grid min-h-dvh place-items-center px-4 py-24">
      <div className="absolute top-[max(16px,env(safe-area-inset-top))] left-5 md:top-8 md:left-10">
        <Logo />
      </div>
      <div className="flex w-full max-w-[480px] flex-col items-center gap-5 text-center">
        {result === 'working' && (
          <>
            <span className="spin size-12 rounded-full border-[5px] border-ink/10 border-t-ink" aria-hidden />
            <p className="text-ink-2">One moment…</p>
          </>
        )}
        {result === 'done' && (
          <>
            <span className="grid size-16 place-items-center rounded-full border border-hair text-primary">
              <CheckCircle size={44} weight="fill" />
            </span>
            <h1 className="display text-4xl leading-[1.05] md:text-5xl">You're unsubscribed</h1>
            <p className="max-w-[34ch] text-base text-ink-2">We won't email you scan reminders any more. You can turn them back on in Settings.</p>
          </>
        )}
        {result === 'failed' && (
          <>
            <span className="grid size-16 place-items-center rounded-full border border-hair text-canttell-ink">
              <Warning size={44} weight="bold" />
            </span>
            <h1 className="display text-4xl leading-[1.05] md:text-5xl">This link didn't work</h1>
            <p className="max-w-[34ch] text-base text-ink-2">It may be incomplete. Sign in and switch the reminder off in Settings instead.</p>
          </>
        )}
        <Link to="/" className={buttonVariants({ variant: 'secondary', size: 'lg', className: 'mt-2' })}>
          Open Receipts
        </Link>
      </div>
    </main>
  )
}
