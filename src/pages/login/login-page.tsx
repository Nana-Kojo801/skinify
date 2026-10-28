import { useAuthActions } from '@convex-dev/auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DEMO_EMAIL, DEMO_PASSWORD } from '@shared/demo-account'

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

  return (
    <main className="relative isolate flex min-h-[100dvh] flex-col justify-between overflow-hidden text-white">
      <img src="/images/login-hero.jpg" alt="" className="absolute inset-0 -z-20 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#06222c]/45 via-[#06222c]/20 to-[#06222c]/90" />

      <header className="mx-auto w-full max-w-md px-5 pt-6">
        <span className="text-lg font-semibold tracking-tight">receipts</span>
      </header>

      <section className="mx-auto w-full max-w-md px-5 pb-8">
        <h1 className="display rise">
          Is it <strong>actually</strong> working?
        </h1>
        <p className="rise mt-3 max-w-[32ch] text-base text-white/85" style={{ '--i': 1 } as React.CSSProperties}>
          Scan your skin each week and get an honest verdict on every product.
        </p>

        <form
          onSubmit={onSubmit}
          className="rise mt-6 flex flex-col gap-3 rounded-3xl border border-white/20 bg-[#06222c]/55 p-4 backdrop-blur-md"
          style={{ '--i': 2 } as React.CSSProperties}
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Email
            <input name="email" type="email" autoComplete="email" required className="field text-foreground" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Password
            <input
              name="password"
              type="password"
              autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'}
              minLength={8}
              required
              className="field text-foreground"
            />
            {flow === 'signUp' && <span className="text-xs font-normal text-white/75">At least 8 characters.</span>}
          </label>
          {error && (
            <p role="alert" className="rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-red-800">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending} className="bg-white text-[#06222c] hover:bg-white/90">
            {pending ? 'Please wait…' : flow === 'signIn' ? 'Sign in' : 'Create account'}
          </Button>
          <button
            type="button"
            className="py-1 text-sm text-white/90 underline underline-offset-4"
            onClick={() => {
              setError(null)
              setFlow(flow === 'signIn' ? 'signUp' : 'signIn')
            }}
          >
            {flow === 'signIn' ? 'No account? Sign up' : 'Already have an account? Sign in'}
          </button>
        </form>

        <Button
          variant="ghost"
          size="lg"
          className="rise mt-3 w-full border border-white/40 text-white hover:bg-white/15 hover:text-white"
          style={{ '--i': 3 } as React.CSSProperties}
          onClick={onDemo}
          disabled={pending}
        >
          Try the demo
        </Button>
      </section>
    </main>
  )
}
