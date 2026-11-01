import { Camera, House, ListBullets, User, WifiSlash } from '@phosphor-icons/react'
import { useQuery } from 'convex/react'
import { Suspense, useEffect, useSyncExternalStore } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { Logo } from '@/components/logo'
import { PageSkeleton } from '@/components/page-skeleton'
import { api } from '../../convex/_generated/api'

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
          <Link to="/settings" className="account-link" aria-label="Your account"><span className="avatar">{me?.email?.[0]?.toUpperCase() || <User size={16} />}</span><span className="account-label">{me?.isDemoAccount ? 'Demo account' : 'Your account'}</span></Link>
        </div>
      </header>
      {!online && <p className="offline-notice" role="status"><WifiSlash size={18} /> You're offline. Showing what was loaded last. Scans need a connection.</p>}
      <div id="main-content" className={`app-content ${isForm ? 'has-form' : ''}`} tabIndex={-1}>
        <Suspense fallback={<PageSkeleton />}><div key={pathname} className="page-in"><Outlet /></div></Suspense>
      </div>
      {!isForm && <nav className="bottom-nav print:hidden" aria-label="Mobile navigation">
        {mobileLinks.map(({ to, label, icon: Icon, active }) => <Link key={to} to={to} aria-current={active ? 'page' : undefined}><Icon size={23} weight={active ? 'fill' : 'regular'} /><span>{label}</span></Link>)}
      </nav>}
    </div>
  )
}
