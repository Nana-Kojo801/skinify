import { ArrowsLeftRight, CaretLeft, PencilSimple, Trash } from '@phosphor-icons/react'
import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageSkeleton } from '@/components/page-skeleton'
import { Reveal } from '@/components/reveal'
import { ScoreRing } from '@/components/score-ring'
import { Button, buttonVariants } from '@/components/ui/button'
import { daysBetween, formatDate, formatPoints } from '@/lib/format'
import { productImage, productRank } from '@/lib/product-image'
import { VERDICT_STYLE } from '@/lib/verdict-display'
import { CONCERNS, isConcernKey } from '@shared/concerns'
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
  if (product === null) {
    return (
      <main className="mx-auto max-w-md px-5 pt-16 text-center">
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <Link to="/" className={buttonVariants({ variant: 'soft', className: 'mt-5' })}>
          Back home
        </Link>
      </main>
    )
  }

  const concern = isConcernKey(product.targetConcern) ? CONCERNS[product.targetConcern].label : product.targetConcern
  const points = scans
    .filter((scan) => scan.scores[product.targetConcern] !== undefined)
    .map((scan) => ({ createdAt: scan.createdAt, score: scan.scores[product.targetConcern], flagged: scan.qualityFlag }))
  const day = daysBetween(product.startDate, now)
  const started = product.startDate <= now
  const isDemo = usage?.isDemoAccount ?? true
  const lineColor = verdict ? VERDICT_STYLE[verdict.verdict].line : 'var(--color-coral)'
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
    <main className="mx-auto max-w-6xl md:px-8 md:pt-8">
      <div className="md:grid md:grid-cols-[0.85fr_1.15fr] md:items-start md:gap-10">
        <div className="relative h-[340px] overflow-hidden md:sticky md:shadow-(--shadow-photo) md:top-24 md:aspect-[4/5] md:h-auto md:rounded-[32px]">
          <div className="parallax size-full">
            <img src={productImage(productRank(products ?? [], product._id))} alt="" className="settle size-full object-cover object-[50%_55%]" />
          </div>
          <div className="absolute inset-x-0 top-0 flex h-[72px] items-center justify-between px-4">
            <Link to="/" aria-label="Back to products" className="press grid size-11 place-items-center rounded-full bg-card shadow-[0_6px_16px_-6px_rgb(46_36_32/0.4)]">
              <CaretLeft size={20} weight="bold" />
            </Link>
            {!isDemo && (
              <Link to={`/products/${productId}/edit`} className={buttonVariants({ variant: 'white', size: 'sm' })}>
                <PencilSimple size={17} />
                Edit
              </Link>
            )}
          </div>
        </div>

        <div className="relative z-10 -mt-9 flex flex-col gap-3.5 rounded-t-[32px] bg-cream px-4 shadow-[0_-14px_28px_-18px_rgb(46_36_32/0.35)] md:mt-0 md:gap-5 md:rounded-none md:bg-transparent md:px-0 md:shadow-none">
          <section className="rise px-1 pt-5 md:pt-0">
            <h1 className="text-[31px] leading-[1.08] font-semibold tracking-[-0.035em] md:text-5xl">{product.name}</h1>
            <p className="mt-1.5 text-muted md:text-[17px]">
              Targets {concern.toLowerCase()} · started {formatDate(product.startDate)}
              {started ? ` · day ${day}` : ''}
            </p>
          </section>

          <div className="rise" style={{ '--i': 1 } as React.CSSProperties}>
            {verdict ? (
              <VerdictPanel verdict={verdict.verdict} reasons={verdict.reasons} inputs={verdict.inputs} targetConcern={product.targetConcern} day={day} />
            ) : (
              <section className="rounded-(--radius-card) bg-sand p-6">
                <h2 className="text-xl font-semibold">No verdict yet</h2>
                <p className="mt-1 text-muted">Add scans to get a verdict.</p>
              </section>
            )}
          </div>

          {verdict && verdict.verdict !== 'TOO_EARLY' && inputs && inputs.baselineMean !== null && inputs.recentPostMean !== null && (
            <Reveal as="section" className="card px-5 pt-5.5 pb-4.5">
              <div className="flex items-center justify-around">
                <ScoreRing value={inputs.baselineMean} label="Before" size={104} stroke="#cdbdb1" numberClassName="text-[32px]" labelClassName="text-[13px] font-semibold" />
                <CaretLeft size={24} weight="bold" className="mb-7 rotate-180 text-[#b3a397]" aria-hidden />
                <ScoreRing value={inputs.recentPostMean} label="Now" size={104} stroke={lineColor} numberClassName="text-[32px]" labelClassName="text-[13px] font-semibold text-cocoa" index={3} />
              </div>
              <ul className="mt-4.5 grid grid-cols-3 border-t border-line pt-3.5 text-center">
                <li>
                  <p className="text-lg font-semibold">±{formatPoints(inputs.noise)}</p>
                  <p className="text-xs text-muted">noise</p>
                </li>
                <li>
                  <p className="text-lg font-semibold">{inputs.baselineCount}</p>
                  <p className="text-xs text-muted">scans before</p>
                </li>
                <li>
                  <p className="text-lg font-semibold">{inputs.postCount}</p>
                  <p className="text-xs text-muted">scans after</p>
                </li>
              </ul>
            </Reveal>
          )}

          {verdict && (
            <Reveal as="section" className="tile rounded-(--radius-card) px-5 py-5.5 md:px-7">
              <h2 className="text-lg font-semibold">What this means</h2>
              <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line">{summary}</p>
              {nextStep && (
                <div className="mt-3.5 rounded-[20px] bg-card px-4 py-3.5 shadow-(--shadow-card)">
                  <p className="text-xs font-bold tracking-[0.06em] text-coral-ink uppercase">Next step</p>
                  <p className="mt-0.5 font-semibold">{nextStep}</p>
                </div>
              )}
              {verdict.rescanAdvice.length > 0 && (
                <ul className="mt-3.5 flex flex-col gap-2 text-sm text-cocoa-soft">
                  {verdict.rescanAdvice.map((advice) => (
                    <li key={advice}>{advice}</li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[12.5px] text-muted">Not medical advice. Ask a pharmacist or dermatologist about skin problems.</p>
            </Reveal>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex flex-col gap-3.5 px-4 md:mt-10 md:grid md:grid-cols-[1.6fr_1fr] md:items-start md:gap-6 md:px-0">
        <Reveal as="section" className="card px-4 pt-5 pb-4 md:px-6">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-lg font-semibold">{concern} over time</h2>
            <span className="text-[12.5px] text-muted">Higher is healthier</span>
          </div>
          <p className="mt-0.5 px-1 text-[12.5px] text-muted">The dashed line is the day you started.</p>
          <div className="mt-3">
            <TimelineChart points={points} startDate={product.startDate} color={lineColor} />
          </div>
        </Reveal>

        <Reveal as="section" className="card px-5 pt-4.5 pb-2" index={1}>
          <h2 className="text-lg font-semibold">Every scan</h2>
          {points.length === 0 ? (
            <p className="py-4 text-muted">No scans yet.</p>
          ) : (
            <ul className="mt-1.5">
              {[...points].reverse().map((point) => (
                <li key={point.createdAt} className="flex min-h-[52px] items-center justify-between border-t border-line">
                  <span>
                    <span className="font-semibold">{formatDate(point.createdAt)}</span>
                    <span className="block text-[13px] text-muted">
                      {point.createdAt < product.startDate + DAY_MS ? 'Baseline' : 'After start'}
                      {point.flagged ? ' · lower quality' : ''}
                    </span>
                  </span>
                  <span className="text-[22px] font-semibold tracking-[-0.02em] tabular-nums">{Math.round(point.score)}</span>
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      </div>

      <div className="mt-4 flex flex-col gap-2.5 px-4 md:mt-8 md:flex-row md:items-center md:px-0">
        {scans.length >= 2 && (
          <Link to={`/compare/${productId}`} className={buttonVariants({ size: 'lg' })}>
            <ArrowsLeftRight size={19} />
            Compare before and after
          </Link>
        )}
        {!isDemo && (
          <Button variant="ghost" size="lg" className="text-irritation-ink md:ml-auto" onClick={() => setConfirming(true)}>
            <Trash size={19} />
            Delete this product
          </Button>
        )}
      </div>

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
