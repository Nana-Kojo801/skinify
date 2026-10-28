import { Plus } from '@phosphor-icons/react'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { productRank } from '@/lib/product-image'
import { CONCERNS, isConcernKey } from '@shared/concerns'
import { api } from '../../../convex/_generated/api'
import { ProductCard } from './components/product-card'

export function HomePage() {
  const products = useQuery(api.products.list)
  const verdicts = useQuery(api.verdicts.latestForAll)
  const latestScan = useQuery(api.scans.latest)
  const usage = useQuery(api.scans.usage)
  const [now] = useState(() => Date.now())

  const verdictByProduct = new Map(verdicts?.map((entry) => [entry.productId, entry.verdict]))
  const isDemo = usage?.isDemoAccount ?? false

  const blocked = isDemo
    ? 'The demo runs on sample data, so live scans are off.'
    : usage && !usage.serviceAvailable
      ? 'Scanning is paused: the free scan budget for this app is used up.'
      : usage?.nextScanAt && !usage.canScan
        ? `Daily limit reached. Next scan ${formatDate(usage.nextScanAt)}.`
        : null

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-5 pt-4 pb-12">
      <section className="rise relative isolate flex min-h-[15rem] flex-col justify-end overflow-hidden rounded-3xl p-5 text-white">
        <img src="/images/home-hero.jpg" alt="" className="absolute inset-0 -z-20 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#06222c]/85 via-[#06222c]/25 to-transparent" />
        <h1 className="display">
          Your <strong>skin</strong>, with receipts.
        </h1>
        <p className="mt-1 text-sm text-white/85">
          {latestScan === undefined
            ? ' '
            : latestScan
              ? `Last scan ${formatDate(latestScan.createdAt)}`
              : 'No scans yet. Scan before you start a product, so there is a baseline.'}
        </p>
        {usage?.canScan ? (
          <Link to="/scan" className={buttonVariants({ size: 'lg' }) + ' mt-4 bg-white text-[#06222c] hover:bg-white/90'}>
            New scan
          </Link>
        ) : (
          blocked && <p className="mt-3 rounded-2xl bg-[#06222c]/70 px-4 py-2.5 text-sm backdrop-blur">{blocked}</p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-light tracking-tight">
            Your <strong className="font-semibold">products</strong>
          </h2>
          {!isDemo && (
            <Link to="/products/new" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <Plus size={16} weight="bold" />
              Add
            </Link>
          )}
        </div>

        {products === undefined ? (
          <div className="flex flex-col gap-4" aria-hidden>
            {[0, 1].map((i) => (
              <div key={i} className="surface h-52 animate-pulse bg-secondary" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="surface flex flex-col items-start gap-3 p-5">
            <h3 className="text-lg font-semibold tracking-tight">Nothing to judge yet</h3>
            <p className="text-sm text-muted-foreground">
              Add a product you want to test, then scan weekly. After about four weeks you get a verdict.
            </p>
            <Link to="/products/new" className={buttonVariants()}>
              Add your first product
            </Link>
          </div>
        ) : (
          products.map((product, index) => (
            <ProductCard
              key={product._id}
              id={product._id}
              rank={productRank(products, product._id)}
              name={product.name}
              concernLabel={isConcernKey(product.targetConcern) ? CONCERNS[product.targetConcern].label : product.targetConcern}
              startDate={product.startDate}
              now={now}
              verdict={verdictByProduct.get(product._id)?.verdict ?? null}
              index={index + 1}
            />
          ))
        )}
      </section>
    </main>
  )
}
