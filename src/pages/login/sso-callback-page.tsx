import { HandleSSOCallback } from '@clerk/react'
import { useNavigate } from 'react-router'

// Where Google sends the browser back to. Clerk finishes the sign-in (or sign-up for a new Google user) and
// we continue to the app. If Clerk needs anything else it returns to the login page.
export function SsoCallbackPage() {
  const navigate = useNavigate()
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center" aria-busy="true">
      <div className="message-paper">
        <span className="spin size-14 rounded-full border-[5px] border-ink/10 border-t-ink" aria-hidden />
        <h1 className="display text-[32px] leading-none md:text-[48px]">Signing you in…</h1>
        <p className="text-[15.5px] text-ink-2">Finishing Google sign-in. This takes a moment.</p>
      </div>
      <HandleSSOCallback
      navigateToApp={({ decorateUrl }) => {
        const url = decorateUrl('/')
        if (url.startsWith('http')) window.location.href = url
        else void navigate(url)
      }}
      navigateToSignIn={() => void navigate('/login')}
      navigateToSignUp={() => void navigate('/login')}
      />
    </main>
  )
}
