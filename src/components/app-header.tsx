import { useAuthActions } from '@convex-dev/auth/react'
import { GearSix, SignOut } from '@phosphor-icons/react'
import { useQuery } from 'convex/react'
import { Link, NavLink, Outlet } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { api } from '../../convex/_generated/api'

// Navigation in the reference site's layout: wordmark, a divider, text links, and one white action on the right.
export function AppHeader() {
  const { signOut } = useAuthActions()
  const usage = useQuery(api.scans.usage)
  const navLink = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors hover:text-white ${isActive ? 'text-white' : 'text-white/70'}`
  const iconButton =
    'flex size-10 items-center justify-center rounded-full border border-white/25 text-white/85 transition-colors hover:border-white/60 hover:text-white'

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-navy/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 md:h-20 md:px-8">
          <Link to="/" className="text-xl font-bold tracking-tight">
            receipts
          </Link>
          <span className="hidden h-8 w-px bg-white/15 md:block" />
          <nav className="hidden items-center gap-8 md:flex">
            <NavLink to="/" end className={navLink}>
              Products
            </NavLink>
            <NavLink to="/settings" className={navLink}>
              Settings
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            {usage?.canScan && (
              <Link to="/scan" className={buttonVariants({ size: 'sm' })}>
                New scan
              </Link>
            )}
            <Link to="/settings" aria-label="Settings" className={`${iconButton} md:hidden`}>
              <GearSix size={20} />
            </Link>
            <button type="button" aria-label="Sign out" className={iconButton} onClick={() => void signOut()}>
              <SignOut size={20} />
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </>
  )
}
