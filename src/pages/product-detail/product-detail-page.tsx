import { ArrowRight, ArrowsLeftRight, Drop, PencilSimple, Trash } from '@phosphor-icons/react'
import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { BackLink } from '@/components/back-link'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { OverlapWarning } from '@/components/overlap-warning'
import { PageSkeleton } from '@/components/page-skeleton'
import { Reveal } from '@/components/reveal'
import { ScoreRing } from '@/components/score-ring'
import { Button, buttonVariants } from '@/components/ui/button'
import { daysBetween, formatDate, formatPoints } from '@/lib/format'
import { productImage, productRank } from '@/lib/product-image'
import { cn } from '@/lib/utils'
import { VERDICT_STYLE } from '@/lib/verdict-display'
import { CONCERNS, isConcernKey } from '@shared/concerns'
import { overlapsFor } from '@shared/products/overlap'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { TimelineChart } from './components/timeline-chart'
import { VerdictPanel } from './components/verdict-panel'

const DAY_MS = 86_400_000

/** "…start. Next step: keep using it." -> ["…start.", "Keep using it."] (the next step gets its own callout). */
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
  const lineColor = verdict ? VERDICT_STYLE[verdict.verdict].line : 'var(--color-ink)'
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

  const image = productImage(productRank(products ?? [], product._id))
  const meta = `Targets ${concern.toLowerCase()} · started ${formatDate(product.startDate)}${started ? ` · day ${day}` : ''}`

  const beforeNow = verdict && verdict.verdict !== 'TOO_EARLY' && inputs && inputs.baselineMean !== null && inputs.recentPostMean !== null && (
    <Reveal as="section" className="tile p-5">
      <h2 className="text-[21px] font-extrabold tracking-[-0.02em]">Before and now</h2>
      <div className="mt-4 flex items-center justify-center gap-4">
        <ScoreRing value={inputs.baselineMean} label="Before" size={104} thickness={7} stroke="rgb(14 23 38 / 0.25)" numberClassName="text-[32px]" labelClassName="text-[13px]" />
        <ArrowRight size={22} weight="bold" className="mb-7 text-ink-3" aria-hidden />
        <ScoreRing value={inputs.recentPostMean} label="Now" size={104} thickness={7} stroke={lineColor} numberClassName="text-[32px]" labelClassName="text-[13px] text-ink" index={3} />
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-2 text-center">
        <li className="well px-1 py-2.5">
          <p className="text-[22px] leading-none font-extrabold tracking-[-0.03em]">±{formatPoints(inputs.noise)}</p>
          <p className="mt-1 text-xs font-semibold text-ink-2">noise</p>
        </li>
        <li className="well px-1 py-2.5">
          <p className="text-[22px] leading-none font-extrabold tracking-[-0.03em]">{inputs.baselineCount}</p>
          <p className="mt-1 text-xs font-semibold text-ink-2">scans before</p>
        </li>
        <li className="well px-1 py-2.5">
          <p className="text-[22px] leading-none font-extrabold tracking-[-0.03em]">{inputs.postCount}</p>
          <p className="mt-1 text-xs font-semibold text-ink-2">scans after</p>
        </li>
      </ul>
    </Reveal>
  )

  const meaning = verdict && (
    <Reveal as="section" className="tile p-5 md:p-6">
      <h2 className="text-[21px] font-extrabold tracking-[-0.02em]">What this means</h2>
      <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-ink-2">{summary}</p>
      {nextStep && (
        <div className="tile-accent mt-3.5 rounded-[20px] px-4 py-3.5">
          <p className="text-xs font-extrabold tracking-[0.06em] uppercase">Next step</p>
          <p className="mt-0.5 font-bold">{nextStep}</p>
        </div>
      )}
      {verdict.rescanAdvice.length > 0 && (
        <ul className="mt-3.5 flex flex-col gap-2 text-sm text-ink-2">
          {verdict.rescanAdvice.map((advice) => (
            <li key={advice}>{advice}</li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[12.5px] text-ink-2">Not medical advice. Ask a pharmacist or dermatologist about skin problems.</p>
    </Reveal>
  )

  const chart = (
    <Reveal as="section" className="tile px-4 pt-5 pb-4 md:px-6">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-[21px] font-extrabold tracking-[-0.02em]">{concern} over time</h2>
        <span className="text-[12.5px] font-semibold text-ink-2">Higher is healthier</span>
      </div>
      <p className="mt-0.5 px-1 text-[13px] text-ink-2">The dashed line is the day you started.</p>
      <div className="mt-3">
        <TimelineChart points={points} startDate={product.startDate} color={lineColor} />
      </div>
    </Reveal>
  )

  const history = (
    <Reveal as="section" className="tile px-5 pt-5 pb-2" index={1}>
      <h2 className="text-[21px] font-extrabold tracking-[-0.02em]">Every scan</h2>
      {points.length === 0 ? (
        <p className="py-4 text-ink-2">No scans yet.</p>
      ) : (
        <ul className="mt-1.5">
          {[...points].reverse().map((point) => (
            <li key={point.createdAt} className="flex min-h-[54px] items-center justify-between border-t border-hair first:border-t-0">
              <span>
                <span className="font-bold">{formatDate(point.createdAt)}</span>
                <span className="block text-[13px] text-ink-2">
                  {point.createdAt < product.startDate + DAY_MS ? 'Baseline' : 'After start'}
                  {point.flagged ? ' · lower quality' : ''}
                </span>
              </span>
              <span className="text-[22px] font-extrabold tracking-[-0.03em] tabular-nums">{Math.round(point.score)}</span>
            </li>
          ))}
        </ul>
      )}
    </Reveal>
  )

  const verdictBlock = verdict ? (
    <VerdictPanel verdict={verdict.verdict} reasons={verdict.reasons} inputs={verdict.inputs} targetConcern={product.targetConcern} day={day} />
  ) : (
    <section className="tile p-6">
      <h2 className="text-[21px] font-extrabold">No verdict yet</h2>
      <p className="mt-1 text-ink-2">Add scans to get a verdict.</p>
    </section>
  )

  const compareLink = (className?: string) =>
    scans.length >= 2 && (
      <Link to={`/compare/${productId}`} className={buttonVariants({ size: 'lg', className })}>
        <ArrowsLeftRight size={19} weight="bold" />
        Compare before and after
      </Link>
    )
  const editLink = (className?: string) =>
    !isDemo && (
      <Link to={`/products/${productId}/edit`} className={cn(buttonVariants({ variant: 'soft', size: 'lg' }), className)}>
        <PencilSimple size={18} weight="bold" />
        Edit
      </Link>
    )
  const deleteButton = (className?: string) =>
    !isDemo && (
      <Button variant="danger" size="lg" className={className} onClick={() => setConfirming(true)}>
        <Trash size={19} weight="bold" />
        Delete this product
      </Button>
    )

  return (
    <main className="detail-page">
      <BackLink to="/" label="Product shelf" />
      <header className="detail-heading rise"><div><p className="kicker">PRODUCT JOURNAL / {concern}</p><h1 className="editorial-title">{product.name}</h1><p className="page-description">{meta}</p></div><div className="detail-actions">{editLink()}{compareLink()}</div></header>
      {overlaps.length > 0 && <OverlapWarning overlaps={overlaps} concern={concern.toLowerCase()} />}
      <div className="detail-grid"><div className="detail-evidence"><div className="detail-verdict">{verdictBlock}</div>{chart}{meaning}</div><aside className="detail-reference"><div className="product-journal-label"><img src={image} alt="" /><span>THE PRODUCT JOURNAL<br /><b>{concern}</b><small>Illustrative product image</small></span></div>{beforeNow}{history}{deleteButton('w-full')}</aside></div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={(open) => {
          if (!pending) setConfirming(open)
        }}
        title="Delete this product?"
        description="Its verdicts are deleted too. Your scans stay, so you can add it again later."
        confirmLabel="Yes, delete this product"
        cancelLabel="Keep it"
        pending={pending}
        error={error}
        onConfirm={() => void onRemove()}
      />
    </main>
  )
}

function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 pt-32 text-center md:pt-40">
      <span className="tile grid size-[92px] place-items-center rounded-[32px]" aria-hidden>
        <Drop size={40} />
      </span>
      <h1 className="display text-[32px] leading-[1.05] md:text-[48px]">Product not found</h1>
      <p className="text-[15.5px] text-ink-2">It may have been deleted, or the link is wrong.</p>
      <Link to="/" className={buttonVariants({ variant: 'soft', size: 'lg' })}>
        Back home
      </Link>
    </main>
  )
}
