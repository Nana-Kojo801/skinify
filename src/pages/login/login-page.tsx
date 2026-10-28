import { useAuthActions } from '@convex-dev/auth/react'
import { Warning } from '@phosphor-icons/react'
import { useState } from 'react'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DEMO_EMAIL, DEMO_PASSWORD } from '@shared/demo-account'
import { SCAN_CONFIG } from '@shared/scan/scan-config'
import { VERDICT_CONFIG } from '@shared/verdict/verdict-config'

type Flow = 'signIn' | 'signUp'

// Map Convex Auth's server errors to messages a person can act on.
function describeError(error: unknown, flow: Flow): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/InvalidPassword|at least 8/i.test(message)) {
    return 'Password must be at least 8 characters.'
  }
  if (/InvalidAccountId|Invalid credentials|InvalidSecret/i.test(message)) {
    return flow === 'signIn'
      ? 'Wrong email or password.'
      : 'Could not create the account. Try again.'
  }
  if (/already exists|AccountAlreadyExists/i.test(message)) {
    return 'An account with this email already exists. Sign in instead.'
  }
  return flow === 'signIn'
    ? 'Could not sign in. Check your email and password.'
    : 'Could not sign up. Try a different email or a longer password.'
}

export function LoginPage() {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<Flow>('signIn')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    formData.set('flow', flow)
    setError(null)
    setPending(true)
    try {
      await signIn('password', formData)
    } catch (e) {
      setError(describeError(e, flow))
    } finally {
      setPending(false)
    }
  }

  async function onDemo() {
    setError(null)
    setPending(true)
    try {
      await signIn('password', { email: DEMO_EMAIL, password: DEMO_PASSWORD, flow: 'signIn' })
    } catch {
      setError('The demo account is not available right now. Please create an account instead.')
    } finally {
      setPending(false)
    }
  }

  function switchFlow(next: Flow) {
    setError(null)
    setFlow(next)
  }

  return (
    <main className="min-h-dvh md:grid md:grid-cols-[1.05fr_1fr]">
      <div className="photo relative h-[340px] overflow-hidden rounded-b-[36px] md:sticky md:top-4 md:m-4 md:h-[calc(100dvh-2rem)] md:rounded-[36px]">
        <img src="/images/scan-portrait.webp" alt="" className="settle size-full object-cover object-[50%_40%]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-cocoa/45 to-transparent" />
        <header className="absolute inset-x-0 top-0 flex h-16 items-center justify-between px-[18px] text-white md:h-20 md:px-7">
          <Logo inverted />
          <Button variant="white" size="sm" onClick={onDemo} disabled={pending}>
            Try the demo
          </Button>
        </header>
        <div
          className="rise absolute bottom-[18px] left-4 flex items-center gap-2.5 rounded-full bg-card py-2 pr-4 pl-2 shadow-(--shadow-float) md:bottom-7 md:left-7"
          style={{ '--i': 4 } as React.CSSProperties}
          aria-hidden
        >
          <span className="grid size-9 place-items-center rounded-full bg-working-bg text-[13px] font-bold text-working-ink">72</span>
          <span className="text-[13px] leading-tight">
            <strong className="font-bold text-working-ink">Working</strong>
            <span className="block text-xs text-muted">Acne +13.1 since day 1</span>
          </span>
        </div>
      </div>

      <section className="mx-auto w-full max-w-[460px] px-5 pt-6 pb-10 md:flex md:flex-col md:justify-center md:px-8 md:py-16">
        <h1 className="rise text-[31px] leading-[1.08] font-semibold tracking-[-0.035em] md:text-[44px]">Is your skincare actually working?</h1>
        <p className="rise mt-2 text-muted md:mt-3 md:text-[17px]" style={{ '--i': 1 } as React.CSSProperties}>
          Scan your face once a week. Get an honest verdict on every product, based on the numbers.
        </p>

        <form onSubmit={onSubmit} className="rise mt-5 flex flex-col gap-3 md:mt-8" style={{ '--i': 2 } as React.CSSProperties}>
          <div className="relative grid grid-cols-2 rounded-full bg-sand p-1 shadow-(--shadow-inset)" role="group" aria-label="Sign in or create an account">
            <span
              aria-hidden
              className={cn(
                'absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-card shadow-[0_4px_12px_-4px_rgb(46_36_32/0.2)] transition-transform duration-300 ease-(--ease-out-soft)',
                flow === 'signUp' && 'translate-x-full',
              )}
            />
            {(['signIn', 'signUp'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={flow === value}
                aria-label={value === 'signIn' ? 'Switch to sign in' : 'Switch to create account'}
                onClick={() => switchFlow(value)}
                className={cn('relative min-h-11 cursor-pointer text-[14.5px] font-semibold transition-colors', flow === value ? 'text-cocoa' : 'text-muted')}
              >
                {value === 'signIn' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1.5 text-[13.5px] font-semibold">
            Email
            <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="field" />
          </label>
          <label className="flex flex-col gap-1.5 text-[13.5px] font-semibold">
            {flow === 'signUp' ? 'Password, at least 8 characters' : 'Password'}
            <input
              name="password"
              type="password"
              autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'}
              minLength={8}
              required
              placeholder="••••••••"
              className="field"
            />
          </label>
          {error && (
            <p role="alert" className="flex items-start gap-2.5 rounded-2xl bg-irritation-bg px-4 py-3 text-sm text-irritation-ink">
              <Warning size={18} className="mt-px shrink-0" />
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending} className="mt-1">
            {pending ? 'Please wait…' : flow === 'signIn' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <ul className="rise mt-5 flex justify-between border-t border-nude px-1 pt-4 md:mt-10" style={{ '--i': 3 } as React.CSSProperties}>
          <Fact value={String(SCAN_CONFIG.photosPerScan)} label="photos per scan" />
          <Fact value={String(VERDICT_CONFIG.minDaysSinceStart)} label="days to a verdict" />
          <Fact value="0" label="photos ever stored" />
        </ul>
      </section>
    </main>
  )
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <li>
      <p className="text-lg font-bold md:text-2xl">{value}</p>
      <p className="text-xs text-muted md:text-sm">{label}</p>
    </li>
  )
}
