import { useSignIn, useSignUp } from '@clerk/react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Mode = 'signIn' | 'signUp'
/** After the password is accepted Clerk may want an emailed code: to verify a new address, or on a new device. */
type CodeStep = { flow: 'signUp' | 'signIn'; email: string }
type ClerkFailure = { message: string; longMessage?: string } | null

const messageOf = (error: NonNullable<ClerkFailure>) => error.longMessage ?? error.message

type Props = {
  pending: boolean
  setPending: (pending: boolean) => void
  setError: (message: string | null) => void
}

// Email + password through Clerk's custom-flow API. Clerk sends the verification codes; we never see passwords
// after handing them to Clerk, and nothing about the sign-in is stored by us until users.store runs.
export function EmailAuthForm({ pending, setPending, setError }: Props) {
  const { signIn } = useSignIn()
  const { signUp } = useSignUp()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signIn')
  const [codeStep, setCodeStep] = useState<CodeStep | null>(null)

  const goHome = () => {
    void navigate('/')
  }

  /** Runs one step; shows Clerk's own readable message when it fails. Returns true when it worked. */
  async function attempt(step: () => Promise<{ error: ClerkFailure }>): Promise<boolean> {
    const { error } = await step()
    if (error) {
      setError(messageOf(error))
      return false
    }
    return true
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const emailAddress = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    setError(null)
    setPending(true)
    try {
      if (mode === 'signUp') {
        if (!(await attempt(() => signUp.password({ emailAddress, password })))) return
        if (signUp.status === 'complete') {
          await attempt(() => signUp.finalize({ navigate: goHome }))
        } else if (await attempt(() => signUp.verifications.sendEmailCode())) {
          setCodeStep({ flow: 'signUp', email: emailAddress })
        }
        return
      }

      if (!(await attempt(() => signIn.password({ emailAddress, password })))) return
      if (signIn.status === 'complete') {
        await attempt(() => signIn.finalize({ navigate: goHome }))
      } else if (signIn.status === 'needs_client_trust') {
        // A new device: Clerk asks for a code emailed to the address.
        if (await attempt(() => signIn.mfa.sendEmailCode())) setCodeStep({ flow: 'signIn', email: emailAddress })
      } else {
        setError('Could not finish signing in. Try Continue with Google, or contact the person who runs this app.')
      }
    } finally {
      setPending(false)
    }
  }

  async function onVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!codeStep) return
    const code = String(new FormData(event.currentTarget).get('code') ?? '').trim()
    setError(null)
    setPending(true)
    try {
      if (codeStep.flow === 'signUp') {
        if (!(await attempt(() => signUp.verifications.verifyEmailCode({ code })))) return
        if (signUp.status === 'complete') await attempt(() => signUp.finalize({ navigate: goHome }))
        else setError('Your account needs one more step that this app cannot show. Try Continue with Google.')
      } else {
        if (!(await attempt(() => signIn.mfa.verifyEmailCode({ code })))) return
        if (signIn.status === 'complete') await attempt(() => signIn.finalize({ navigate: goHome }))
        else setError('Could not finish signing in. Try again.')
      }
    } finally {
      setPending(false)
    }
  }

  async function onResend() {
    if (!codeStep) return
    setError(null)
    setPending(true)
    try {
      await attempt(() => (codeStep.flow === 'signUp' ? signUp.verifications.sendEmailCode() : signIn.mfa.sendEmailCode()))
    } finally {
      setPending(false)
    }
  }

  function switchMode(next: Mode) {
    setError(null)
    setMode(next)
  }

  function backToForm() {
    setError(null)
    setCodeStep(null)
    void signIn.reset()
    void signUp.reset()
  }

  if (codeStep) {
    return (
      <form onSubmit={onVerify} className="flex flex-col gap-3">
        <p className="text-[15.5px] leading-snug text-ink-2">
          We emailed a 6-digit code to <strong className="font-bold">{codeStep.email}</strong>. Enter it to continue.
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          Code
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            placeholder="123456"
            className="field h-16 text-center text-[28px] font-extrabold tracking-[0.5em]"
          />
        </label>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Please wait…' : 'Verify and continue'}
        </Button>
        <div className="flex justify-between gap-3 text-sm">
          <button type="button" onClick={() => void onResend()} disabled={pending} className="min-h-11 cursor-pointer font-bold text-ink underline decoration-[1.5px] underline-offset-[3px] disabled:opacity-45">
            Send a new code
          </button>
          <button type="button" onClick={backToForm} disabled={pending} className="min-h-11 cursor-pointer font-bold text-ink-2 underline decoration-[1.5px] underline-offset-[3px] disabled:opacity-45">
            Use a different email
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="auth-tabs" role="group" aria-label="Sign in or create an account">
        {(['signIn', 'signUp'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            aria-label={value === 'signIn' ? 'Switch to sign in' : 'Switch to create account'}
            onClick={() => switchMode(value)}
            className={cn('relative min-h-11 cursor-pointer text-[14.5px] font-bold transition-colors duration-300', mode === value ? 'text-ink' : 'text-ink-2')}
          >
            {value === 'signIn' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-bold">
        Email
        <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="field" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-bold">
        {mode === 'signUp' ? 'Password, at least 8 characters' : 'Password'}
        <input
          name="password"
          type="password"
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          minLength={mode === 'signUp' ? 8 : undefined}
          required
          placeholder="••••••••"
          className="field"
        />
      </label>
      {/* Clerk draws its bot check here when a sign-up needs one. */}
      {mode === 'signUp' && <div id="clerk-captcha" />}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Create account'}
      </Button>
    </form>
  )
}
