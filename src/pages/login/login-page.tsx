import { useSignIn } from '@clerk/react'
import { Warning } from '@phosphor-icons/react'
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

  return (
    <main className="login-page">
      <header className="login-header"><Logo /><span className="kicker">A PERSONAL SKIN JOURNAL</span><Button variant="outline" size="sm" onClick={() => void onDemo()} disabled={pending}>Try the demo</Button></header>
      <div className="login-layout">
        <section className="login-story"><p className="kicker rise">LESS GUESSWORK. MORE PERSPECTIVE.</p><h1 className="rise">Good skincare<br />deserves<br /><em>good evidence.</em></h1><p className="login-intro rise">A quiet space to track your routine, notice what changes, and find out what’s actually working.</p>
          <div className="login-still-life"><img src="/images/product-amber.webp" alt="Amber skincare bottle in natural light" /><div className="sample-receipt"><span className="kicker">RECEIPTS / SAMPLE ENTRY</span><div className="receipt-line" /><p>Salicylic acid cleanser</p><span>Acne · 37 days tracked</span><div className="receipt-value">+13.1<small>points</small></div><span className="receipt-verdict">↗ Working</span><div className="receipt-line" /><span className="receipt-fine">A measurable change.<br />A little less wondering.</span></div><span className="photo-caption">Small rituals, seen clearly.</span></div>
        </section>
        <section className="login-form-panel"><p className="kicker">YOUR NEXT CHAPTER</p><h2>Make yourself<br /><em>at home.</em></h2><p className="text-ink-2 text-sm">Your skin has a story. Start keeping track.</p><div className="login-form-fields"><EmailAuthForm pending={pending} setPending={setPending} setError={setError} />{error && <p role="alert" className="journal-notice is-error"><Warning size={18} />{error}</p>}<div className="auth-divider"><span />or continue with<span /></div><Button variant="outline" size="lg" onClick={() => void onGoogle()} disabled={pending}><GoogleMark />Continue with Google</Button><button className="demo-text-button" type="button" onClick={() => void onDemo()} disabled={pending}>Just looking? Try the demo <span>↗</span></button><p className="auth-note">Explore a read-only journal with sample scans.</p></div><div className="login-privacy"><span aria-hidden>◎</span><p>Your photos are analysed, then discarded.<br />Only your scores stay in your journal.</p></div></section>
      </div>
      <footer className="login-footer"><span>Keep the routine. Keep the receipts.</span><span>Weekly scans · Honest verdicts · Your own pace</span></footer>
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
