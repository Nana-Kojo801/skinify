import { useClerk } from '@clerk/react'
import { GearSix, House, ScanSmiley, SignOut, WifiSlash, FileText, ArrowUpRight } from '@phosphor-icons/react'
import { useQuery } from 'convex/react'
import { Suspense, useEffect, useSyncExternalStore } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { Logo } from '@/components/logo'
import { PageSkeleton } from '@/components/page-skeleton'
import { cn } from '@/lib/utils'
import { api } from '../../convex/_generated/api'

function useOnline() {
  return useSyncExternalStore((change) => {
    window.addEventListener('online', change); window.addEventListener('offline', change)
    return () => { window.removeEventListener('online', change); window.removeEventListener('offline', change) }
  }, () => navigator.onLine, () => true)
}

export function AppShell() {
  const { signOut } = useClerk()
  const usage = useQuery(api.scans.usage)
  const { pathname } = useLocation()
  const online = useOnline()
  const isForm = pathname === '/products/new' || pathname.endsWith('/edit')
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  const items = [
    { to: '/', label: 'Journal', icon: House, active: pathname === '/' || pathname.startsWith('/products/') || pathname.startsWith('/compare/') },
    { to: '/scan', label: 'Scan', icon: ScanSmiley, active: pathname === '/scan' },
    { to: '/report', label: 'Report', icon: FileText, active: false },
    { to: '/settings', label: 'Settings', icon: GearSix, active: pathname === '/settings' },
  ]
  return (
    <div className="workspace">
      <a className="skip-link" href="#page-content">Skip to content</a>
      <aside className="workspace-sidebar">
        <Link to="/" aria-label="Receipts home"><Logo inverted /></Link>
        <p className="sidebar-caption">YOUR SKIN, ON RECORD</p>
        <nav aria-label="Main" className="sidebar-nav">
          {items.map(({ to, label, icon: Icon, active }, i) => <Link key={to} to={to} aria-current={active ? 'page' : undefined} className={cn('sidebar-link', active && 'is-active')}><Icon size={20} weight={active ? 'fill' : 'regular'} /><span>{label}</span><span className="nav-number">0{i + 1}</span></Link>)}
        </nav>
        <div className="sidebar-note"><span className="note-star" aria-hidden>✳</span><p>A little consistency.<br />A clearer picture.</p><span>One scan. Every week.</span>{usage?.canScan && <Link to="/scan">Start your check-in <ArrowUpRight size={16} /></Link>}</div>
        <div className="sidebar-bottom"><span>{usage?.isDemoAccount ? 'Sample journal' : 'Personal journal'}</span><button type="button" onClick={() => void signOut()} aria-label="Sign out"><SignOut size={20} /></button></div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar"><Link to="/" aria-label="Receipts home" className="mobile-brand"><Logo /></Link><span className="desktop-crumb">Personal care <span>/</span> {pathname === '/settings' ? 'Settings' : pathname === '/scan' ? 'Weekly check-in' : pathname.includes('/compare') ? 'Comparison' : pathname.includes('/products') ? 'Product journal' : 'My journal'}</span><span className="private-label"><i /> {usage?.isDemoAccount ? 'Demo · sample data' : 'Your private space'}</span></header>
        {!online && <p role="status" className="offline-notice"><WifiSlash size={18} />You're offline. Showing what was loaded last. Scans need a connection.</p>}
        <div id="page-content" key={pathname} className="page-in workspace-content" tabIndex={-1}><Suspense fallback={<PageSkeleton />}><Outlet /></Suspense></div>
        <footer className="workspace-footer"><span>Keep the routine. Keep the receipts.</span><span>Estimates from photos · Not medical advice</span></footer>
      </div>
      {!isForm && <nav className="mobile-nav" aria-label="Mobile navigation">{items.map(({ to, label, icon: Icon, active }) => <Link key={to} to={to} aria-current={active ? 'page' : undefined} className={cn(active && 'is-active')}><Icon size={22} weight={active ? 'fill' : 'regular'} /><span>{label}</span></Link>)}</nav>}
    </div>
  )
}
