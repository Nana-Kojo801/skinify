import { Navigate, Outlet } from 'react-router'
import { LogoMark } from '@/components/logo'
import { useStoreUser } from '@/lib/use-store-user'

function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true" aria-label="Loading">
      <LogoMark className="size-10 animate-[breathe_1.4s_ease-in-out_infinite]" />
    </div>
  )
}

// Wraps every private route: anonymous visitors only ever see /login.
export function RequireAuth() {
  const { isLoading, isAuthenticated, failed } = useStoreUser()
  if (isLoading) return <Loading />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (failed) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <p className="max-w-sm text-muted">We could not set up your account. Please reload the page and try again.</p>
      </main>
    )
  }
  return <Outlet />
}

// Wraps /login: signed-in users go straight to the home page.
export function RedirectIfAuthed() {
  const { isLoading, isAuthenticated } = useStoreUser()
  if (isLoading) return <Loading />
  if (isAuthenticated) return <Navigate to="/" replace />
  return <Outlet />
}
