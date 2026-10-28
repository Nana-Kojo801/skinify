import { useAuthActions } from '@convex-dev/auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
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

  // Inputs inside the white bar: label above value, no borders (the bar draws the frame).
  const barField = 'w-full bg-transparent text-base text-navy outline-none placeholder:text-navy/40'
  const barCell = 'flex flex-col gap-1 px-5 py-3.5 text-left'

  return (
    <main className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden">
      <img src="/images/login-portrait.jpg" alt="" className="absolute inset-0 -z-20 size-full object-cover object-top md:hidden" />
      <img src="/images/login-wide.jpg" alt="" className="absolute inset-0 -z-20 hidden size-full object-cover md:block" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-navy/70 via-navy/45 to-navy" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8 md:py-7">
        <span className="text-xl font-bold tracking-tight">receipts</span>
        <Button onClick={onDemo} disabled={pending}>
          Try the demo
        </Button>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-5 pb-10 md:items-center md:justify-center md:px-8 md:pb-0 md:text-center">
        <h1 className="heading rise text-[2.6rem] leading-[1.05] md:text-6xl">
          Is your skincare <strong>actually working?</strong>
        </h1>
        <p className="rise mt-4 max-w-xl text-lg text-white/80" style={{ '--i': 1 } as React.CSSProperties}>
          Scan your face once a week. Get an honest verdict on every product, based on the numbers.
        </p>

        <form onSubmit={onSubmit} className="rise mt-9 w-full max-w-3xl" style={{ '--i': 2 } as React.CSSProperties}>
          <p className="mb-2.5 text-left text-sm text-white/80">
            <strong className="font-medium text-white">{flow === 'signIn' ? 'Sign in' : 'Create'}</strong>{' '}
            {flow === 'signIn' ? 'to your account' : 'your free account'}
          </p>
          <div className="grid overflow-hidden rounded-lg bg-white text-navy md:grid-cols-[1fr_1fr_auto] md:p-2">
            <label className={`${barCell} border-b border-navy/10 md:border-r md:border-b-0`}>
              <span className="text-xs text-navy/60">Email</span>
              <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" className={barField} />
            </label>
            <label className={barCell}>
              <span className="text-xs text-navy/60">Password{flow === 'signUp' ? ', at least 8 characters' : ''}</span>
              <input
                name="password"
                type="password"
                autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'}
                minLength={8}
                required
                placeholder="••••••••"
                className={barField}
              />
            </label>
            <div className="p-2 md:p-0">
              <Button type="submit" variant="navy" size="lg" disabled={pending} className="h-full min-h-12 w-full md:w-auto md:px-10">
                {pending ? 'Please wait…' : flow === 'signIn' ? 'Sign in' : 'Create account'}
              </Button>
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-3 rounded-md bg-[#3d1717] px-4 py-3 text-left text-sm text-[#f7c3bd]">
              {error}
            </p>
          )}
          <button
            type="button"
            className="mt-4 text-sm text-white/85 underline underline-offset-4 hover:text-white"
            onClick={() => {
              setError(null)
              setFlow(flow === 'signIn' ? 'signUp' : 'signIn')
            }}
          >
            {flow === 'signIn' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>
        </form>
      </section>

      <footer className="mx-auto grid w-full max-w-6xl grid-cols-3 gap-4 border-t border-white/15 px-5 py-6 md:mt-16 md:px-8 md:py-8">
        <Fact value={String(SCAN_CONFIG.photosPerScan)} label="photos per scan" />
        <Fact value={String(VERDICT_CONFIG.minDaysSinceStart)} label="days to a verdict" />
        <Fact value="0" label="photos ever stored" />
      </footer>
    </main>
  )
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-3xl font-medium tracking-tight md:text-4xl">{value}</p>
      <p className="mt-1 text-xs text-white/70 md:text-sm">{label}</p>
    </div>
  )
}
