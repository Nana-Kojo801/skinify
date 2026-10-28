import { useConvexAuth } from 'convex/react'
import { Navigate, Outlet } from 'react-router'
import { LogoMark } from '@/components/logo'

function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center" aria-busy="true" aria-label="Loading">
      <LogoMark className="size-10 animate-[breathe_1.4s_ease-in-out_infinite]" />
    </div>
  )
}

// Wraps every private route: anonymous visitors only ever see /login.
export function RequireAuth() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  if (isLoading) return <Loading />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}

// Wraps /login: signed-in users go straight to the home page.
export function RedirectIfAuthed() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  if (isLoading) return <Loading />
  if (isAuthenticated) return <Navigate to="/" replace />
  return <Outlet />
}
