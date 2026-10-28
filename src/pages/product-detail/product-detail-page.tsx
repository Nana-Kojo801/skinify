import { ArrowLeft } from '@phosphor-icons/react'
import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { VerdictCard } from '@/components/verdict-card'
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

  if (product === undefined || scans === undefined) return <p className="p-5 text-sm text-muted-foreground">Loading…</p>
  if (product === null) return <p className="p-4 text-sm">Product not found. <Link to="/" className="underline">Back home</Link></p>

  const concernLabel = isConcernKey(product.targetConcern) ? CONCERNS[product.targetConcern].label : product.targetConcern
  const points = scans
    .filter((scan) => scan.scores[product.targetConcern] !== undefined)
    .map((scan) => ({ createdAt: scan.createdAt, score: scan.scores[product.targetConcern] }))
  const day = daysBetween(product.startDate, now)
  const isDemo = usage?.isDemoAccount ?? false

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
    <main className="mx-auto max-w-md px-5 pt-4 pb-12 md:max-w-5xl">
      <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start md:gap-8">
      <div className="contents md:flex md:flex-col md:gap-6">
      <header className="rise">
        <div className="relative h-40 overflow-hidden rounded-3xl">
          <img src={productImage(productRank(products ?? [], product._id))} alt="" className="size-full object-cover" />
          <Link
            to="/"
            aria-label="Back to products"
            className="absolute top-3 left-3 flex size-10 items-center justify-center rounded-full bg-white/90 text-foreground backdrop-blur transition-transform active:scale-95"
          >
            <ArrowLeft size={20} weight="bold" />
          </Link>
        </div>
        <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-tight">{product.name}</h1>
        <p className="text-sm text-muted-foreground">
          Targets {concernLabel.toLowerCase()}, started {formatDate(product.startDate)}
          {product.startDate <= now ? ` (day ${day})` : ''}
        </p>
      </header>

      <div className="rise" style={{ '--i': 1 } as React.CSSProperties}>
        <VerdictCard data={verdict ?? null} />
      </div>

      <div className="rise order-last flex flex-col gap-2 md:order-none" style={{ '--i': 4 } as React.CSSProperties}>
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
          <>
            <Link to={`/products/${productId}/edit`} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Edit product
            </Link>
            {confirming ? (
              <Button variant="destructive" size="lg" onClick={onRemove}>
                Yes, delete this product
              </Button>
            ) : (
              <Button variant="ghost" size="lg" onClick={() => setConfirming(true)}>
                Delete product
              </Button>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
      </div>
      <div className="contents md:flex md:flex-col md:gap-6">
      <section className="rise surface flex flex-col gap-3 p-5" style={{ '--i': 2 } as React.CSSProperties}>
        <h2 className="text-xl font-light tracking-tight">
          <strong className="font-semibold">{concernLabel}</strong> over time
        </h2>
        <TimelineChart points={points} startDate={product.startDate} />
        <p className="text-xs text-muted-foreground">Higher is healthier. The dashed line is the start date.</p>
      </section>

      <section className="rise flex flex-col gap-3" style={{ '--i': 3 } as React.CSSProperties}>
        <h2 className="text-xl font-light tracking-tight">
          Your <strong className="font-semibold">scans</strong>
        </h2>
        {scans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scans yet.</p>
        ) : (
          <ul className="surface divide-y divide-border overflow-hidden">
            {[...scans].reverse().map((scan) => (
              <li key={scan._id} className="flex items-center justify-between px-5 py-3.5">
                <span className="flex flex-col">
                  <span className="font-medium">{formatDate(scan.createdAt)}</span>
                  <span className="text-xs text-muted-foreground">
                    {scan.createdAt < product.startDate ? 'Baseline' : 'After start'}
                    {scan.qualityFlag ? ', lower quality' : ''}
                  </span>
                </span>
                <span className="text-2xl font-semibold tracking-tight">{Math.round(scan.scores[product.targetConcern] ?? 0)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      </div>
      </div>
    </main>
  )
}
