import { useClerk } from '@clerk/react'
import { GearSix, House, ScanSmiley, SignOut, WifiSlash } from '@phosphor-icons/react'
import { useQuery } from 'convex/react'
import { Suspense, useSyncExternalStore } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Logo } from '@/components/logo'
import { PageSkeleton } from '@/components/page-skeleton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api } from '../../convex/_generated/api'

/** navigator.onLine, kept up to date. */
function useOnline() {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('online', onChange)
      window.addEventListener('offline', onChange)
      return () => {
        window.removeEventListener('online', onChange)
        window.removeEventListener('offline', onChange)
      }
    },
    () => navigator.onLine,
    () => true,
  )
}

// Shell for every signed-in page: a glass top bar on desktop, a floating smoked-glass tab bar on phones,
// and a soft page transition on every navigation. Each page draws its own heading.
export function AppShell() {
  const { signOut } = useClerk()
  const usage = useQuery(api.scans.usage)
  const { pathname } = useLocation()
  const isForm = pathname === '/products/new' || pathname.endsWith('/edit')
  const homeActive = pathname === '/' || pathname.startsWith('/products/') || pathname.startsWith('/compare/')
  const scanActive = pathname === '/scan'
  const settingsActive = pathname === '/settings'
  const online = useOnline()

  return (
    <div className="min-h-dvh">
      {/* Desktop navigation */}
      <header className="sticky top-0 z-30 hidden bg-fog/60 shadow-[inset_0_-1px_0_rgb(14_23_38/0.06)] backdrop-blur-[22px] backdrop-saturate-[1.8] md:block">
        <div className="mx-auto flex h-[76px] max-w-[1260px] items-center gap-4 px-10">
          <Link to="/" aria-label="Receipts home" className="press">
            <Logo />
          </Link>
          <nav className="glass mx-auto flex items-center gap-1 rounded-full p-[5px]" aria-label="Main">
            <NavLink to="/" end className={() => desktopLink(homeActive)}>
              Home
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => desktopLink(isActive)}>
              Settings
            </NavLink>
          </nav>
          <div className="flex items-center gap-2.5">
            {usage?.canScan && (
              <Link to="/scan" className={buttonVariants({ size: 'sm' })}>
                <ScanSmiley size={19} weight="bold" />
                New scan
              </Link>
            )}
            <button type="button" aria-label="Sign out" onClick={() => void signOut()} className={buttonVariants({ variant: 'soft', size: 'icon' })}>
              <SignOut size={19} weight="bold" />
            </button>
          </div>
        </div>
      </header>

      {!online && (
        <p
          role="status"
          className="glass-dark pop-in fixed inset-x-3 top-[max(10px,env(safe-area-inset-top))] z-40 mx-auto flex max-w-[560px] items-center gap-2.5 rounded-[20px] px-4 py-2.5 text-[13.5px] font-semibold text-white md:top-[88px]"
        >
          <WifiSlash size={18} weight="bold" className="shrink-0" />
          You're offline. Showing what was loaded last. Scans need a connection.
        </p>
      )}

      <div key={pathname} className={cn('page-in', isForm ? 'pb-16' : 'pb-36', 'md:pb-24')}>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </div>

      {/* Phone tab bar: smoked liquid glass, the active tab gets a soft glass pill that springs in */}
      {!isForm && (
        <>
          <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-32 bg-linear-to-t from-fog via-fog/80 to-transparent md:hidden" />
          <nav
            aria-label="Main"
            className="glass-dark rise fixed bottom-[max(22px,env(safe-area-inset-bottom))] left-1/2 z-30 flex h-[66px] -translate-x-1/2 items-center gap-1.5 rounded-full px-2 md:hidden"
            style={{ '--i': 3 } as React.CSSProperties}
          >
            <Link to="/" aria-label="Home" aria-current={homeActive ? 'page' : undefined} className={tabClass(homeActive)}>
              <House size={24} weight={homeActive ? 'fill' : 'regular'} />
            </Link>
            <Link
              to="/scan"
              aria-label="New scan"
              aria-current={scanActive ? 'page' : undefined}
              className={cn(
                'press grid h-[50px] w-20 place-items-center rounded-full bg-[image:var(--sheen)] bg-primary text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.5),0_6px_16px_-6px_rgb(0_104_224/0.7)] transition-transform duration-500 ease-(--ease-spring)',
                scanActive && 'scale-105',
              )}
            >
              <ScanSmiley size={26} weight="bold" />
            </Link>
            <Link to="/settings" aria-label="Settings" aria-current={settingsActive ? 'page' : undefined} className={tabClass(settingsActive)}>
              <GearSix size={24} weight={settingsActive ? 'fill' : 'regular'} />
            </Link>
          </nav>
        </>
      )}
    </div>
  )
}

function desktopLink(active: boolean) {
  return cn(
    'press grid h-10 place-items-center rounded-full px-5 text-[14.5px] font-bold transition-[background-color,color,box-shadow] duration-500 ease-(--ease-liquid)',
    active ? 'bg-[radial-gradient(120%_120%_at_50%_0%,var(--color-primary-hi)_0%,var(--color-primary)_62%)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]' : 'text-ink-2 hover:text-ink',
  )
}

function tabClass(active: boolean) {
  return cn(
    'press relative grid h-[50px] w-[58px] place-items-center rounded-full transition-[background-color,color,box-shadow] duration-500 ease-(--ease-liquid)',
    active ? 'bg-white/15 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]' : 'text-white/60',
  )
}
