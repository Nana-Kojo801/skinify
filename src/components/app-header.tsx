import { useAuthActions } from '@convex-dev/auth/react'
import { GearSix, SignOut } from '@phosphor-icons/react'
import { Link, Outlet } from 'react-router'

// Quiet top bar: wordmark left, two icon buttons right.
export function AppHeader() {
  const { signOut } = useAuthActions()
  const iconButton =
    'flex size-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-secondary active:scale-95'
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-5">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            receipts
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/settings" aria-label="Settings" className={iconButton}>
              <GearSix size={22} weight="light" />
            </Link>
            <button type="button" aria-label="Sign out" className={iconButton} onClick={() => void signOut()}>
              <SignOut size={22} weight="light" />
            </button>
          </nav>
        </div>
      </header>
      <Outlet />
    </>
  )
}
