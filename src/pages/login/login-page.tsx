import { useSignIn } from '@clerk/react'
import { GoogleLogo, Warning } from '@phosphor-icons/react'
import { useAction } from 'convex/react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { EmailAuthForm } from './components/email-auth-form'
import { SCAN_CONFIG } from '@shared/scan/scan-config'
import { VERDICT_CONFIG } from '@shared/verdict/verdict-config'
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

  return (
    <main className="min-h-dvh md:grid md:grid-cols-[1.05fr_1fr]">
      <div className="photo relative h-[340px] overflow-hidden rounded-b-[36px] md:sticky md:top-4 md:m-4 md:h-[calc(100dvh-2rem)] md:rounded-[36px]">
        <img src="/images/scan-portrait.webp" alt="" className="settle size-full object-cover object-[50%_40%]" />
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-cocoa/45 to-transparent" />
        <header className="absolute inset-x-0 top-0 flex h-16 items-center justify-between px-[18px] text-white md:h-20 md:px-7">
          <Logo inverted />
          <Button variant="white" size="sm" onClick={() => void onDemo()} disabled={pending}>
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

        <div className="rise mt-6 flex flex-col gap-3 md:mt-8" style={{ '--i': 2 } as React.CSSProperties}>
          <EmailAuthForm pending={pending} setPending={setPending} setError={setError} />
          {error && (
            <p role="alert" className="flex items-start gap-2.5 rounded-2xl bg-irritation-bg px-4 py-3 text-sm text-irritation-ink">
              <Warning size={18} className="mt-px shrink-0" />
              {error}
            </p>
          )}
          <p className="my-1 flex items-center gap-3 text-[13px] text-muted before:h-px before:flex-1 before:bg-nude after:h-px after:flex-1 after:bg-nude">or</p>
          <Button variant="outline" size="lg" onClick={() => void onGoogle()} disabled={pending}>
            <GoogleLogo size={20} weight="bold" />
            Continue with Google
          </Button>
          <Button variant="soft" size="lg" onClick={() => void onDemo()} disabled={pending}>
            Try the demo
          </Button>
          <p className="px-1 text-[13px] text-muted">The demo is a read-only account with sample scans.</p>
        </div>

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
