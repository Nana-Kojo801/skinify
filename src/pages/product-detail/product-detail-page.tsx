import { ArrowLeft } from '@phosphor-icons/react'
import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { VerdictBadge } from '@/components/verdict-badge'
import { VerdictCard, VerdictFigures } from '@/components/verdict-card'
import { Button, buttonVariants } from '@/components/ui/button'
import { daysBetween, formatDate } from '@/lib/format'
import { productImage, productRank } from '@/lib/product-image'
import { CONCERNS, isConcernKey } from '@shared/concerns'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { TimelineChart } from './components/timeline-chart'

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
  const [error, setError] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  if (product === undefined || scans === undefined) return <p className="mx-auto max-w-6xl p-8 text-muted-foreground">Loading…</p>
  if (product === null) return <p className="p-4 text-sm">Product not found. <Link to="/" className="underline">Back home</Link></p>

  const concernLabel = isConcernKey(product.targetConcern) ? CONCERNS[product.targetConcern].label : product.targetConcern
  const points = scans
    .filter((scan) => scan.scores[product.targetConcern] !== undefined)
    .map((scan) => ({ createdAt: scan.createdAt, score: scan.scores[product.targetConcern] }))
  const day = daysBetween(product.startDate, now)
  const isDemo = usage?.isDemoAccount ?? true

  async function onRemove() {
    setError(null)
    try {
      await remove({ productId })
      void navigate('/')
    } catch (e) {
      setError(e instanceof ConvexError ? String(e.data.message) : 'Could not delete the product.')
    }
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-14 px-5 pt-6 pb-20 md:gap-20 md:px-8 md:pt-10">
      <section className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:gap-12">
        <div className="rise relative">
          <img
            src={productImage(productRank(products ?? [], product._id))}
            alt=""
            className="aspect-[4/3] w-full rounded-lg object-cover md:aspect-[4/5]"
          />
          <Link
            to="/"
            aria-label="Back to products"
            className="absolute top-4 left-4 flex size-11 items-center justify-center rounded-full bg-white text-navy transition-transform active:scale-95"
          >
            <ArrowLeft size={20} weight="bold" />
          </Link>
        </div>

        <div className="rise flex flex-col justify-center" style={{ '--i': 1 } as React.CSSProperties}>
          <div>{verdict ? <VerdictBadge verdict={verdict.verdict} /> : <span className="text-sm text-muted-foreground">No verdict yet</span>}</div>
          <h1 className="mt-4 text-4xl leading-[1.05] font-bold tracking-tight md:text-6xl">{product.name}</h1>
          <p className="mt-3 text-lg text-white/75">
            Targets <strong className="font-medium text-white">{concernLabel.toLowerCase()}</strong>, started {formatDate(product.startDate)}
            {product.startDate <= now ? `, day ${day}` : ''}
          </p>
          {verdict && (
            <div className="mt-9 border-t border-white/10 pt-8">
              <VerdictFigures inputs={verdict.inputs} />
            </div>
          )}
          <div className="mt-9 flex flex-wrap gap-3">
            {usage?.canScan && (
              <Link to="/scan" className={buttonVariants({ size: 'lg' })}>
                New scan
              </Link>
            )}
            {scans.length >= 2 && (
              <Link to={`/compare/${productId}`} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                Compare before and after
              </Link>
            )}
            {!isDemo && (
              <Link to={`/products/${productId}/edit`} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                Edit
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 md:items-start">
        <div className="rise" style={{ '--i': 2 } as React.CSSProperties}>
          <VerdictCard data={verdict ?? null} />
        </div>
        <div className="rise panel p-6 md:p-8" style={{ '--i': 3 } as React.CSSProperties}>
          <h2 className="text-2xl font-light">
            <strong className="font-bold">{concernLabel}</strong> over time
          </h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">Higher is healthier. The dashed line is the day you started.</p>
          <TimelineChart points={points} startDate={product.startDate} />
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="heading text-4xl">
          Every <strong>scan</strong>
        </h2>
        {scans.length === 0 ? (
          <p className="text-muted-foreground">No scans yet.</p>
        ) : (
          <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-4">
            {[...scans].reverse().map((scan) => (
              <li key={scan._id} className="flex items-end justify-between gap-4 border-t border-white/15 py-5">
                <span>
                  <span className="block font-medium">{formatDate(scan.createdAt)}</span>
                  <span className="text-sm text-muted-foreground">
                    {scan.createdAt < product.startDate ? 'Baseline' : 'After start'}
                    {scan.qualityFlag ? ', lower quality' : ''}
                  </span>
                </span>
                <span className="text-4xl font-medium tracking-tight tabular-nums">{Math.round(scan.scores[product.targetConcern] ?? 0)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!isDemo && (
        <section className="flex flex-col items-start gap-3 border-t border-white/10 pt-8">
          {confirming ? (
            <div className="flex flex-wrap gap-3">
              <Button variant="destructive" onClick={onRemove}>
                Yes, delete this product
              </Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Keep it
              </Button>
            </div>
          ) : (
            <Button variant="ghost" className="text-white/70" onClick={() => setConfirming(true)}>
              Delete this product
            </Button>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </section>
      )}
    </main>
  )
}
