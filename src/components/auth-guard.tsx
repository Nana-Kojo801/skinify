import { useConvexAuth } from 'convex/react'
import { Navigate, Outlet } from 'react-router'

function Loading() {
  return <p className="p-5 text-sm text-muted-foreground">Loading…</p>
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
