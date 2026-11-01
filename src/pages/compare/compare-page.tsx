import { ArrowRight, ChartBar } from '@phosphor-icons/react'
import { useQuery } from 'convex/react'
import { Link, useParams } from 'react-router'
import { BackLink } from '@/components/back-link'
import { PageSkeleton } from '@/components/page-skeleton'
import { buttonVariants } from '@/components/ui/button'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatDate, formatSigned } from '@/lib/format'
import { CONCERN_KEYS, CONCERNS } from '@shared/concerns'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

const mean = (values: number[]) => values.length ? values.reduce((a,b) => a+b,0) / values.length : null
export function ComparePage() {
  const { id } = useParams()
  const productId = id as Id<'products'>
  const product = useQuery(api.products.get, { productId })
  const scans = useQuery(api.scans.list)
  if (product === undefined || scans === undefined) return <PageSkeleton />
  if (!product) return <main className="screen status-page"><h1>Product not found</h1><Link to="/routine" className={buttonVariants({ variant: 'outline' })}>Back to routine</Link></main>
  const sorted = [...scans].sort((a,b) => a.createdAt - b.createdAt)
  const before = sorted.filter(s => s.createdAt < product.startDate + 86400000)
  const after = sorted.filter(s => s.createdAt >= product.startDate + 86400000).slice(-2)
  const rows = CONCERN_KEYS.map(key => {
    const b = mean(before.flatMap(s => s.scores[key] == null ? [] : [s.scores[key]]))
    const a = mean(after.flatMap(s => s.scores[key] == null ? [] : [s.scores[key]]))
    return { key, label: CONCERNS[key].label, before: b, after: a, change: a != null && b != null ? a-b : null }
  })
  const target = rows.find(r => r.key === product.targetConcern)
  return <main className="screen comparison-page">
    <BackLink to={`/products/${productId}`} label="Product" />
    <header className="screen-heading detail-heading"><div><h1>Before & now</h1><p>{product.name} · Started {formatDate(product.startDate)}</p></div><Link to="/report" className={`${buttonVariants({ variant: 'outline', size: 'sm' })} desktop-only`}><ChartBar size={16} />View full report</Link></header>
    {before.length === 0 || after.length === 0 ? <section className="empty-routine"><h2>More scans needed</h2><p>{before.length === 0 ? 'No scans from before the start date to compare against.' : 'No scans after the start date yet. Scan again to see a comparison.'}</p></section> : <div className="comparison-layout">
      <section className="comparison-summary"><div className="comparison-dates"><span>Before<small>{before.length} baseline scans</small></span><span>Now<small>Latest {after.length} scans</small></span></div>{target && target.before != null && target.after != null && <div className="comparison-highlight"><p>{target.label}</p><div><strong>{Math.round(target.before)}</strong><ArrowRight size={28} /><strong>{Math.round(target.after)}</strong></div><span>{formatSigned(target.change!)} points</span></div>}<p className="comparison-note">Higher scores mean healthier-looking skin. Small changes can be measurement noise.</p></section>
      <section className="comparison-table-wrap"><Table>
        <TableCaption className="sr-only">Average scores before and after starting this product</TableCaption>
        <TableHeader><TableRow><TableHead className="pl-0">Concern</TableHead><TableHead className="text-right">Before</TableHead><TableHead className="text-right">Now</TableHead><TableHead className="text-right">Change</TableHead></TableRow></TableHeader>
        <TableBody>{rows.map(r => (
          <TableRow key={r.key} className={r.key === product.targetConcern ? 'bg-white/[.02]' : ''}>
            <TableHead scope="row" className="py-4 pl-0 text-sm text-foreground normal-case md:py-[17px]">{r.label}</TableHead>
            <TableCell className="py-4 text-right md:py-[17px]">{r.before == null ? '—' : Math.round(r.before)}</TableCell>
            <TableCell className="py-4 text-right md:py-[17px]">{r.after == null ? '—' : Math.round(r.after)}</TableCell>
            <TableCell className={cn('py-4 text-right md:py-[17px]', r.change != null && r.change > 0 && 'text-primary-soft')}>{r.change == null ? '—' : formatSigned(r.change)}</TableCell>
          </TableRow>
        ))}</TableBody>
      </Table><p className="comparison-note">Before: all {before.length} baseline scans. Now: the latest {after.length} after starting. The verdict accounts for scan quality and noise; this table does not.</p></section>
    </div>}
    <Link to="/report" className={`${buttonVariants({ variant: 'outline' })} mobile-report-link`}><ChartBar size={18} />View full report</Link>
  </main>
}
