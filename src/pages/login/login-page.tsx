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
    <main className="mx-auto max-w-md p-4">
      <h1 className="text-xl font-semibold">Receipts</h1>
      <p className="mb-4 text-sm text-neutral-500">
        Is this skincare product actually working?
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-md border px-3 py-2 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'}
            minLength={8}
            required
            className="rounded-md border px-3 py-2 text-base"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? 'Please wait…' : flow === 'signIn' ? 'Sign in' : 'Create account'}
        </Button>
      </form>
      <button
        type="button"
        className="mt-3 text-sm underline"
        onClick={() => {
          setError(null)
          setFlow(flow === 'signIn' ? 'signUp' : 'signIn')
        }}
      >
        {flow === 'signIn'
          ? 'No account? Sign up'
          : 'Already have an account? Sign in'}
      </button>
      <div className="mt-6 border-t pt-4">
        <Button variant="outline" className="w-full" onClick={onDemo} disabled={pending}>
          Try the demo
        </Button>
        <p className="mt-1 text-xs text-neutral-500">Signs you into a read-only account with sample data.</p>
      </div>
    </main>
  )
}
