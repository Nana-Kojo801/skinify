import { HandleSSOCallback } from '@clerk/react'
import { useNavigate } from 'react-router'

// Where Google sends the browser back to. Clerk finishes the sign-in (or sign-up for a new Google user) and
// we continue to the app. If Clerk needs anything else it returns to the login page.
export function SsoCallbackPage() {
  const navigate = useNavigate()
  return (
    <HandleSSOCallback
      navigateToApp={({ decorateUrl }) => {
        const url = decorateUrl('/')
        if (url.startsWith('http')) window.location.href = url
        else void navigate(url)
      }}
      navigateToSignIn={() => void navigate('/login')}
      navigateToSignUp={() => void navigate('/login')}
    />
  )
}
