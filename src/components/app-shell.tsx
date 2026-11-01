import { Camera, House, ListBullets, User, WifiSlash } from '@phosphor-icons/react'
import { useQuery } from 'convex/react'
import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { ErrorBoundary } from '@/components/error-boundary'
import { Logo } from '@/components/logo'
import { PageSkeleton } from '@/components/page-skeleton'
import { TOASTER_EVENT } from '@/lib/toast'
import { Alert } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { api } from '../../convex/_generated/api'

// Mounted on the first toast only (see lib/toast.ts).
const Toaster = lazy(() => import('@/components/ui/sonner').then((m) => ({ default: m.Toaster })))

function useOnline() {
  return useSyncExternalStore((onChange) => {
    window.addEventListener('online', onChange)
    window.addEventListener('offline', onChange)
    return () => {
      window.removeEventListener('online', onChange)
      window.removeEventListener('offline', onChange)
    }
  }, () => navigator.onLine, () => true)
}

export function AppShell() {
  const me = useQuery(api.account.me)
  const { pathname } = useLocation()
  const online = useOnline()
  const [toaster, setToaster] = useState(false)
  useEffect(() => {
    const mount = () => setToaster(true)
    window.addEventListener(TOASTER_EVENT, mount)
    return () => window.removeEventListener(TOASTER_EVENT, mount)
  }, [])
  const routineActive = pathname === '/routine' || pathname.startsWith('/products/') || pathname.startsWith('/compare/')
  const isForm = pathname === '/products/new' || pathname.endsWith('/edit')
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  const desktopLinks = [
    { to: '/', label: 'Overview', active: pathname === '/' },
    { to: '/routine', label: 'Routine', active: routineActive },
    { to: '/scan', label: 'Scans', active: pathname === '/scan' },
    { to: '/report', label: 'Report', active: pathname === '/report' },
  ]
  const mobileLinks = [
    { to: '/', label: 'Home', icon: House, active: pathname === '/' },
    { to: '/scan', label: 'Scan', icon: Camera, active: pathname === '/scan' },
    { to: '/routine', label: 'Routine', icon: ListBullets, active: routineActive },
    { to: '/settings', label: 'You', icon: User, active: pathname === '/settings' || pathname === '/report' },
  ]
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="app-header print:hidden">
        <div className="app-header-inner">
          <Link to="/" aria-label="Receipts home"><Logo /></Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {desktopLinks.map(item => <Link key={item.to} to={item.to} aria-current={item.active ? 'page' : undefined}>{item.label}</Link>)}
          </nav>
          <Link to="/settings" className="account-link" aria-label="Your account"><Avatar><AvatarFallback>{me?.email?.[0]?.toUpperCase() || <User size={16} />}</AvatarFallback></Avatar><span className="account-label">{me?.isDemoAccount ? 'Demo account' : 'Your account'}</span></Link>
        </div>
      </header>
      {!online && <Alert role="status" className="offline-notice"><WifiSlash size={18} /> You're offline. Showing what was loaded last. Scans need a connection.</Alert>}
      <div id="main-content" className={`app-content ${isForm ? 'has-form' : ''}`} tabIndex={-1}>
        <ErrorBoundary key={pathname}><Suspense fallback={<PageSkeleton />}><div className="page-in"><Outlet /></div></Suspense></ErrorBoundary>
      </div>
      {toaster && <Suspense fallback={null}><Toaster /></Suspense>}
      {!isForm && <nav className="bottom-nav print:hidden" aria-label="Mobile navigation">
        {mobileLinks.map(({ to, label, icon: Icon, active }) => <Link key={to} to={to} aria-current={active ? 'page' : undefined}><Icon size={23} weight={active ? 'fill' : 'regular'} /><span>{label}</span></Link>)}
      </nav>}
    </div>
  )
}
