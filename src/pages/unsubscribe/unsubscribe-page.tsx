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
      <div className="flex w-full max-w-[520px] flex-col items-center gap-4 text-center md:rounded-(--radius-tile) md:bg-tile md:bg-[image:var(--sheen)] md:shadow-(--shadow-depth) md:px-10 md:py-11">
        {result === 'working' && (
          <>
            <span className="spin size-12 rounded-full border-[5px] border-ink/10 border-t-ink" aria-hidden />
            <p className="text-ink-2">One moment…</p>
          </>
        )}
        {result === 'done' && (
          <>
            <span className="pop-in grid size-[92px] place-items-center rounded-[32px] bg-[image:var(--sheen)] bg-working-bg text-working-ink shadow-(--shadow-depth-color)">
              <CheckCircle size={44} weight="fill" />
            </span>
            <h1 className="display text-[32px] leading-[1.05] md:text-[40px]">You're unsubscribed</h1>
            <p className="max-w-[34ch] text-[15.5px] text-ink-2">We won't email you scan reminders any more. You can turn them back on in Settings.</p>
          </>
        )}
        {result === 'failed' && (
          <>
            <span className="pop-in grid size-[92px] place-items-center rounded-[32px] bg-[image:var(--sheen)] bg-canttell-bg text-canttell-ink shadow-(--shadow-depth-color)">
              <Warning size={44} weight="bold" />
            </span>
            <h1 className="display text-[32px] leading-[1.05] md:text-[40px]">This link didn't work</h1>
            <p className="max-w-[34ch] text-[15.5px] text-ink-2">It may be incomplete. Sign in and switch the reminder off in Settings instead.</p>
          </>
        )}
        <Link to="/" className={buttonVariants({ variant: 'soft', size: 'lg', className: 'mt-2' })}>
          Open Receipts
        </Link>
      </div>
    </main>
  )
}
