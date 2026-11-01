import { useSignIn } from '@clerk/react'
import { ArrowRight, Warning } from '@phosphor-icons/react'
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

  return <main className="login-page">
    <header className="login-header"><Logo /><span>SKIN / PROGRESS</span></header>
    <div className="login-layout"><section className="login-story"><h1>Keep track<br className="desktop-only" /> of what works.</h1><div className="login-photo"><img src="/images/scan-portrait.webp" alt="Close-up of natural skin" /></div><p className="login-statement">Your skin. Your record.</p><p className="login-description">One weekly scan. An honest look at what your routine is doing.</p></section>
      <section className="login-form-panel" aria-label="Sign in"><h2>Your skin. Your record.</h2><EmailAuthForm pending={pending} setPending={setPending} setError={setError} />{error && <p role="alert" className="notice text-irritation-ink"><Warning size={18} />{error}</p>}<p className="auth-divider">or</p><Button variant="outline" size="lg" onClick={() => void onGoogle()} disabled={pending}><GoogleMark />Continue with Google</Button><button type="button" className="demo-link" onClick={() => void onDemo()} disabled={pending}>Explore a sample routine <ArrowRight size={16} /></button><p className="login-privacy">Your photos are analysed, then discarded.</p></section>
    </div>
    <footer className="login-footer">RECEIPTS / SKIN / PROGRESS</footer>
  </main>
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
