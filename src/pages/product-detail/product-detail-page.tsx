import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { VerdictCard } from '@/components/verdict-card'
import { Button, buttonVariants } from '@/components/ui/button'
import { daysBetween, formatDate } from '@/lib/format'
import { CONCERNS, isConcernKey } from '@shared/concerns'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { TimelineChart } from './components/timeline-chart'

export function ProductDetailPage() {
  const { id } = useParams()
  const productId = id as Id<'products'>
  const navigate = useNavigate()
  const product = useQuery(api.products.get, { productId })
  const verdict = useQuery(api.verdicts.latestForProduct, { productId })
  const scans = useQuery(api.scans.list)
  const usage = useQuery(api.scans.usage)
  const remove = useMutation(api.products.remove)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now] = useState(() => Date.now())

  if (product === undefined || scans === undefined) return <p className="p-4 text-sm text-neutral-500">Loading…</p>
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
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <div>
        <Link to="/" className="text-sm underline">
          ← Products
        </Link>
        <h1 className="text-xl font-semibold">{product.name}</h1>
        <p className="text-sm text-neutral-500">
          Targets {concernLabel.toLowerCase()} · started {formatDate(product.startDate)}
          {product.startDate <= now ? ` (day ${day})` : ''}
        </p>
      </div>

      <VerdictCard data={verdict ?? null} />

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">{concernLabel} over time</h2>
        <TimelineChart points={points} startDate={product.startDate} />
        <p className="text-xs text-neutral-500">Higher is healthier. The green line is the start date.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium">Scans</h2>
        {scans.length === 0 ? (
          <p className="text-sm text-neutral-500">No scans yet.</p>
        ) : (
          <ul className="flex flex-col divide-y rounded-lg border text-sm">
            {[...scans].reverse().map((scan) => (
              <li key={scan._id} className="flex items-center justify-between p-2">
                <span>
                  {formatDate(scan.createdAt)}
                  <span className="text-xs text-neutral-500">{scan.createdAt < product.startDate ? ' · baseline' : ''}</span>
                  {scan.qualityFlag && <span className="text-xs text-amber-700"> · poor quality</span>}
                </span>
                <span className="font-medium">{Math.round(scan.scores[product.targetConcern] ?? 0)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-2">
        {usage?.canScan && (
          <Link to="/scan" className={buttonVariants()}>
            New scan
          </Link>
        )}
        {scans.length >= 2 && (
          <Link to={`/compare/${productId}`} className={buttonVariants({ variant: 'outline' })}>
            Compare before / after
          </Link>
        )}
        {!isDemo && (
          <>
            <Link to={`/products/${productId}/edit`} className={buttonVariants({ variant: 'outline' })}>
              Edit product
            </Link>
            {confirming ? (
              <Button variant="destructive" onClick={onRemove}>
                Yes, delete this product
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => setConfirming(true)}>
                Delete product
              </Button>
            )}
          </>
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </div>
    </main>
  )
}
