import { useAuthActions } from '@convex-dev/auth/react'
import { Link, Outlet } from 'react-router'
import { Button } from '@/components/ui/button'

// Simple header shown on every signed-in page.
export function AppHeader() {
  const { signOut } = useAuthActions()
  return (
    <>
      <header className="mx-auto flex max-w-md items-center justify-between p-4 pb-0">
        <Link to="/" className="font-semibold">
          Receipts
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link to="/settings">Settings</Link>
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        </nav>
      </header>
      <Outlet />
    </>
  )
}
