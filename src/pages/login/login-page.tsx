import { useSignIn } from '@clerk/react'
import { Sparkle, Warning } from '@phosphor-icons/react'
import { useAction } from 'convex/react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { EmailAuthForm } from './components/email-auth-form'
import { api } from '../../../convex/_generated/api'

export function LoginPage() {
  const { signIn } = useSignIn()
  const demoTicket = useAction(api.demo.ticket)
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Google sign-in through Clerk: the browser leaves for Google and comes back to /sso-callback.
  async function onGoogle() {
    setError(null)
    setPending(true)
    const { error: ssoError } = await signIn.sso({
      strategy: 'oauth_google',
      redirectUrl: '/',
      redirectCallbackUrl: '/sso-callback',
    })
    if (ssoError) {
      setError('Could not start Google sign-in. Please try again.')
      setPending(false)
    }
  }

  // The demo account has no password: the server mints a one-time ticket and Clerk signs us in with it.
  async function onDemo() {
    setError(null)
    setPending(true)
    try {
      const ticket = await demoTicket()
      const { error: ticketError } = await signIn.ticket({ ticket })
      if (ticketError || signIn.status !== 'complete') throw new Error('ticket sign-in failed')
      const { error: finalizeError } = await signIn.finalize({
        navigate: () => {
          void navigate('/')
        },
      })
      if (finalizeError) throw new Error('finalize failed')
    } catch {
      setError('The demo account is not available right now. Please create an account instead.')
      setPending(false)
    }
  }

  const verdictCard = (className: string) => (
    <div className={`glass float absolute flex items-center gap-3 rounded-[24px] py-2.5 pr-4 pl-2.5 text-ink ${className}`} aria-hidden>
      <span className="grid size-[54px] place-items-center rounded-[17px] bg-[image:var(--sheen)] bg-accent text-[28px] font-extrabold tracking-[-0.03em]">72</span>
      <span className="text-[13px] leading-tight">
        <strong className="block text-[15px] font-extrabold">Working</strong>
        <span className="text-ink-2">Acne +13.1 since day 1</span>
      </span>
    </div>
  )

  return (
    <main className="min-h-dvh md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="photo-tile relative h-[380px] rounded-t-none md:sticky md:top-4 md:m-4 md:h-[calc(100dvh-2rem)] md:rounded-(--radius-tile)">
        <img src="/images/scan-portrait.webp" alt="" className="settle absolute inset-0 size-full object-cover object-[50%_30%]" />
        <span aria-hidden className="absolute inset-0 bg-linear-to-b from-black/45 via-black/0 via-35% to-black/55 md:to-black/75" />
        <header className="absolute inset-x-0 top-[max(14px,env(safe-area-inset-top))] flex items-center justify-between px-[18px] md:top-6 md:px-7">
          <Logo inverted />
          <Button variant="glass" size="sm" onClick={() => void onDemo()} disabled={pending}>
            Try the demo
          </Button>
        </header>
        {verdictCard('bottom-14 left-[18px] md:top-[38%] md:bottom-auto md:left-7')}
        <div className="absolute inset-x-7 bottom-8 hidden md:block">
          <p className="display text-[56px] leading-[0.98] lg:text-[64px]">Is your skincare actually working?</p>
          <p className="mt-4 max-w-[44ch] text-[17px] text-white/85">Scan your face once a week. Get an honest verdict on every product, based on the numbers.</p>
        </div>
      </div>

      <section className="relative z-10 -mt-9 w-full rounded-t-[34px] bg-[radial-gradient(120%_40%_at_50%_0%,#fff,rgb(255_255_255/0)_70%),var(--color-fog)] px-4 pt-7 pb-12 shadow-[0_-14px_28px_-18px_rgb(0_0_0/0.35)] md:mx-auto md:mt-0 md:flex md:max-w-[460px] md:flex-col md:justify-center md:rounded-none md:bg-none md:px-6 md:py-16 md:shadow-none">
        <h1 className="display rise text-[34px] leading-[1.02] md:hidden">Is your skincare actually working?</h1>
        <p className="rise mt-2.5 text-[15.5px] text-ink-2 md:hidden" style={{ '--i': 1 } as React.CSSProperties}>
          Scan your face once a week. Get an honest verdict on every product, based on the numbers.
        </p>
        <h1 className="display rise hidden text-[44px] leading-[1.02] md:block">Welcome to Receipts</h1>

        <div className="rise mt-6 flex flex-col gap-3 md:mt-8" style={{ '--i': 2 } as React.CSSProperties}>
          <EmailAuthForm pending={pending} setPending={setPending} setError={setError} />
          {error && (
            <p role="alert" className="pop-in flex items-start gap-2.5 rounded-[20px] bg-irritation-bg px-4 py-3 text-sm font-semibold text-irritation-ink">
              <Warning size={18} weight="bold" className="mt-px shrink-0" />
              {error}
            </p>
          )}
          <p className="my-1 flex items-center gap-3 text-[13px] font-bold text-ink-3 before:h-px before:flex-1 before:bg-hair after:h-px after:flex-1 after:bg-hair">or</p>
          <Button variant="soft" size="lg" onClick={() => void onGoogle()} disabled={pending}>
            <GoogleMark />
            Continue with Google
          </Button>
          <Button variant="accent" size="lg" onClick={() => void onDemo()} disabled={pending}>
            <Sparkle size={18} weight="fill" />
            Try the demo
          </Button>
          <p className="px-1 text-center text-[13px] text-ink-2">The demo is a read-only account with sample scans.</p>
        </div>
      </section>
    </main>
  )
}

/** Google's "G", in its own colours. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.8 3.3-8.1z" />
      <path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
    </svg>
  )
}
