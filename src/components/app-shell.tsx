import { useAuthActions } from '@convex-dev/auth/react'
import { House, ScanSmiley, SignOut, SlidersHorizontal } from '@phosphor-icons/react'
import { useQuery } from 'convex/react'
import { Suspense } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Logo } from '@/components/logo'
import { PageSkeleton } from '@/components/page-skeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api } from '../../convex/_generated/api'

/** Routes that show the slim top bar on phones (the others have their own back header over a photo). */
const TOP_LEVEL = new Set(['/', '/settings'])

// Shell for every signed-in page: a top nav on desktop, a slim top bar plus a floating tab bar on phones,
// and a short page transition on every navigation.
export function AppShell() {
  const { signOut } = useAuthActions()
  const usage = useQuery(api.scans.usage)
  const { pathname } = useLocation()
  const isForm = pathname === '/products/new' || pathname.endsWith('/edit')
  const homeActive = pathname === '/' || pathname.startsWith('/products/') || pathname.startsWith('/compare/')

  const signOutButton = (className?: string) => (
    <button
      type="button"
      aria-label="Sign out"
      onClick={() => void signOut()}
      className={cn('press grid size-11 cursor-pointer place-items-center rounded-full bg-sand text-cocoa transition-colors hover:bg-nude', className)}
    >
      <SignOut size={20} />
    </button>
  )

  return (
    <div className="min-h-dvh">
      {/* Desktop navigation */}
      <header className="sticky top-0 z-30 hidden border-b border-line bg-cream/95 md:block">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center gap-8 px-8">
          <Link to="/" aria-label="Receipts home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 rounded-full bg-sand p-1" aria-label="Main">
            <NavLink to="/" end className={() => desktopLink(homeActive)}>
              <House size={18} weight={homeActive ? 'fill' : 'regular'} />
              Products
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => desktopLink(isActive)}>
              <SlidersHorizontal size={18} />
              Settings
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            {usage?.canScan && (
              <Link to="/scan" className={buttonVariants({ size: 'sm' })}>
                <ScanSmiley size={19} />
                New scan
              </Link>
            )}
            {signOutButton()}
          </div>
        </div>
      </header>

      {/* Phone top bar (top-level pages only) */}
      {TOP_LEVEL.has(pathname) && (
        <header className="flex h-16 items-center justify-between px-5 md:hidden">
          <Link to="/" aria-label="Receipts home">
            <Logo />
          </Link>
          {signOutButton()}
        </header>
      )}

      <div key={pathname} className={cn('page-in', isForm ? 'pb-28' : 'pb-32', 'md:pb-20')}>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </div>

      {/* Phone tab bar */}
      {!isForm && (
        <nav
          aria-label="Main"
          className="rise fixed inset-x-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-30 grid h-[70px] grid-cols-[1fr_84px_1fr] items-center rounded-full bg-card shadow-(--shadow-float) md:hidden"
          style={{ '--i': 2 } as React.CSSProperties}
        >
          <Link to="/" aria-current={homeActive ? 'page' : undefined} className={tabClass(homeActive)}>
            <House size={23} weight={homeActive ? 'fill' : 'regular'} />
            Home
          </Link>
          <Link
            to="/scan"
            aria-label="New scan"
            aria-current={pathname === '/scan' ? 'page' : undefined}
            className="press grid size-[58px] place-items-center justify-self-center rounded-full bg-cocoa text-cream shadow-[0_10px_24px_-8px_rgb(46_36_32/0.6)]"
          >
            <ScanSmiley size={26} />
          </Link>
          <NavLink to="/settings" className={({ isActive }) => tabClass(isActive)}>
            {({ isActive }) => (
              <>
                <SlidersHorizontal size={23} weight={isActive ? 'bold' : 'regular'} />
                Settings
              </>
            )}
          </NavLink>
        </nav>
      )}
    </div>
  )
}

function desktopLink(active: boolean) {
  return cn(
    'flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-[background-color,color,box-shadow] duration-300',
    active ? 'bg-card text-cocoa shadow-(--shadow-card)' : 'text-muted hover:text-cocoa',
  )
}

function tabClass(active: boolean) {
  return cn(
    'press flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11.5px] font-semibold transition-colors',
    active ? 'text-cocoa' : 'text-muted',
  )
}
