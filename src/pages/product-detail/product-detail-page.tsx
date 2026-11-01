import { ArrowsLeftRight, PencilSimple, Trash } from '@phosphor-icons/react'
import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { BackLink } from '@/components/back-link'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { OverlapWarning } from '@/components/overlap-warning'
import { PageSkeleton } from '@/components/page-skeleton'
import { ScoreChart } from '@/components/score-chart'
import { Button, buttonVariants } from '@/components/ui/button'
import { daysBetween, formatDate } from '@/lib/format'
import { CONCERNS, isConcernKey } from '@shared/concerns'
import { overlapsFor } from '@shared/products/overlap'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { VerdictPanel } from './components/verdict-panel'

const DAY_MS = 86_400_000
function splitNextStep(summary: string): [string, string | null] {
  const match = summary.match(/^(.*?)\s*Next step:\s*(.+)$/is)
  if (!match) return [summary, null]
  const next = match[2].trim()
  return [match[1].trim(), next.charAt(0).toUpperCase() + next.slice(1)]
}

export function ProductDetailPage() {
  const { id } = useParams()
  const productId = id as Id<'products'>
  const navigate = useNavigate()
  const product = useQuery(api.products.get, { productId })
  const products = useQuery(api.products.list)
  const verdict = useQuery(api.verdicts.latestForProduct, { productId })
  const scans = useQuery(api.scans.list)
  const usage = useQuery(api.scans.usage)
  const remove = useMutation(api.products.remove)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  if (product === undefined || scans === undefined) return <PageSkeleton />
  if (product === null) return <NotFound />

  const concern = isConcernKey(product.targetConcern) ? CONCERNS[product.targetConcern].label : product.targetConcern
  const points = scans
    .filter((scan) => scan.scores[product.targetConcern] !== undefined)
    .map((scan) => ({ createdAt: scan.createdAt, score: scan.scores[product.targetConcern], flagged: scan.qualityFlag }))
  const day = daysBetween(product.startDate, now)
  const overlaps = overlapsFor({ ...product, id: product._id }, products ?? [], now)
  const started = product.startDate <= now
  const isDemo = usage?.isDemoAccount ?? true
  const [summary, nextStep] = verdict ? splitNextStep(verdict.summary) : ['', null]
  const inputs = verdict?.inputs

  async function onRemove() {
    setError(null)
    setPending(true)
    try {
      await remove({ productId })
      void navigate('/')
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data.message) : 'Could not delete the product.')
      setPending(false)
    }
  }

  return (
    <main className="screen product-detail-page">
      <BackLink to="/routine" label="Routine" />
      <header className="screen-heading detail-heading"><div><h1>{product.name}</h1><p>{concern} · Started {formatDate(product.startDate)}{started ? ` · Day ${day}` : ''}</p></div>{!isDemo && <Link to={`/products/${productId}/edit`} className={buttonVariants({ variant: 'outline', size: 'sm' })}><PencilSimple size={16} />Edit product</Link>}</header>
      {overlaps.length > 0 && <OverlapWarning overlaps={overlaps} concern={concern.toLowerCase()} />}
      <div className="evidence-layout">
        <div className="verdict-column">
          {verdict ? <VerdictPanel verdict={verdict.verdict} reasons={verdict.reasons} inputs={verdict.inputs} targetConcern={product.targetConcern} day={day} /> : <section className="verdict-panel"><h2>No verdict yet</h2><p>Add scans to build the evidence.</p></section>}
          {verdict && <section className="next-step-panel"><h2>What next?</h2><p>{nextStep || summary}</p>{nextStep && <details><summary>What this means</summary><p>{summary}</p></details>}{verdict.rescanAdvice.map(advice => <p key={advice}>{advice}</p>)}{scans.length >= 2 && <Link to={`/compare/${productId}`} className="compare-link"><ArrowsLeftRight size={18} />Compare scans<span>→</span></Link>}</section>}
        </div>
        <div className="evidence-main">
          <section className="detail-chart"><div className="section-heading"><h2>{concern} score over time</h2><span>{points.length} scans</span></div><ScoreChart points={points} startDate={product.startDate} baseline={inputs?.baselineMean} label={`${concern} score`} /><p className="chart-quality">The dashed line marks the product start date.</p></section>
          <section className="scan-history"><h2>Scan history</h2>{points.length === 0 ? <p>No scans yet.</p> : <table><caption className="sr-only">All scans for this product’s target concern</caption><thead><tr><th>Date</th><th>{concern}</th><th>Quality</th><th>Period</th></tr></thead><tbody>{[...points].sort((a,b) => b.createdAt - a.createdAt).map(point => <tr key={point.createdAt}><td>{formatDate(point.createdAt)}</td><td>{Math.round(point.score)}</td><td>{point.flagged ? 'Lower quality' : 'Steady'}</td><td>{point.createdAt < product.startDate + DAY_MS ? 'Baseline' : 'After start'}</td></tr>)}</tbody></table>}</section>
        </div>
      </div>
      <footer className="detail-footer"><p>Scores are estimates, not a diagnosis. Ask a pharmacist or dermatologist about skin problems.</p>{!isDemo && <Button variant="danger" size="sm" onClick={() => setConfirming(true)}><Trash size={16} />Delete product</Button>}</footer>
      <ConfirmDialog open={confirming} onOpenChange={open => { if (!pending) setConfirming(open) }} title="Delete this product?" description="Its verdicts are deleted too. Your scans stay, so you can add it again later." confirmLabel="Yes, delete this product" cancelLabel="Keep it" pending={pending} error={error} onConfirm={() => void onRemove()} />
    </main>
  )
}
function NotFound() {
  return <main className="screen status-page"><h1>Product not found</h1><p>It may have been deleted, or the link is wrong.</p><Link to="/routine" className={buttonVariants({ variant: 'outline' })}>Back to routine</Link></main>
}
