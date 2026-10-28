import { useQuery } from 'convex/react'
import { Link } from 'react-router'
import { VerdictBadge } from '@/components/verdict-badge'
import { buttonVariants } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { CONCERNS, isConcernKey } from '@shared/concerns'
import { api } from '../../../convex/_generated/api'

export function HomePage() {
  const products = useQuery(api.products.list)
  const verdicts = useQuery(api.verdicts.latestForAll)
  const latestScan = useQuery(api.scans.latest)
  const usage = useQuery(api.scans.usage)

  const verdictByProduct = new Map(verdicts?.map((entry) => [entry.productId, entry.verdict]))
  const isDemo = usage?.isDemoAccount ?? false

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Your products</h1>

      <div className="flex flex-col gap-1">
        {usage?.canScan ? (
          <Link to="/scan" className={buttonVariants({ size: 'lg' }) + ' h-12 text-base'}>
            New scan
          </Link>
        ) : (
          <p className="rounded-lg border p-3 text-sm text-neutral-600">
            {isDemo
              ? 'The demo runs on sample data, so live scans are turned off.'
              : usage && !usage.serviceAvailable
                ? 'Scanning is paused: the free scan budget for this app has been used up.'
                : usage?.nextScanAt
                  ? `Daily scan limit reached. Next scan available ${formatDate(usage.nextScanAt)}.`
                  : 'Loading…'}
          </p>
        )}
        <p className="text-xs text-neutral-500">
          {latestScan === undefined
            ? ''
            : latestScan
              ? `Last scan: ${formatDate(latestScan.createdAt)}`
              : 'No scans yet. Do one before you start a product, so there is a baseline.'}
        </p>
      </div>

      {products === undefined ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-neutral-500">No products yet. Add the first product you want to check.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {products.map((product) => {
            const verdict = verdictByProduct.get(product._id)
            return (
              <li key={product._id}>
                <Link to={`/products/${product._id}`} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{product.name}</span>
                    <span className="text-xs text-neutral-500">
                      {isConcernKey(product.targetConcern) ? CONCERNS[product.targetConcern].label : product.targetConcern}
                      {' · started '}
                      {formatDate(product.startDate)}
                    </span>
                  </span>
                  {verdict ? (
                    <VerdictBadge verdict={verdict.verdict} />
                  ) : (
                    <span className="text-xs text-neutral-500">No verdict yet</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {!isDemo && (
        <Link to="/products/new" className={buttonVariants({ variant: 'outline' })}>
          Add a product
        </Link>
      )}
    </main>
  )
}
