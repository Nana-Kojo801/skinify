import { useQuery } from 'convex/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLink } from '@/components/arrow-link'
import { buttonVariants } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { productImage, productRank } from '@/lib/product-image'
import { CONCERNS, isConcernKey } from '@shared/concerns'
import { VERDICT_CONFIG } from '@shared/verdict/verdict-config'
import { api } from '../../../convex/_generated/api'
import { LatestScanPanel } from './components/latest-scan-panel'
import { ProductCard } from './components/product-card'

const RULES = [
  { term: 'Baseline', text: `Your scans before the start date. At least ${VERDICT_CONFIG.minBaselineScans} are needed.` },
  { term: 'Noise', text: 'How much two photos of the same face, taken back to back, disagree.' },
  { term: 'Working', text: `The target score improved by more than ${VERDICT_CONFIG.noiseMultiplier} times the noise.` },
  {
    term: 'Too early',
    text: `Under ${VERDICT_CONFIG.minDaysSinceStart} days, or fewer than ${VERDICT_CONFIG.minPostScans} scans since starting.`,
  },
]

export function HomePage() {
  const products = useQuery(api.products.list)
  const verdicts = useQuery(api.verdicts.latestForAll)
  const latestScan = useQuery(api.scans.latest)
  const scans = useQuery(api.scans.list)
  const usage = useQuery(api.scans.usage)
  const [now] = useState(() => Date.now())

  const verdictByProduct = new Map(verdicts?.map((entry) => [entry.productId, entry.verdict]))
  const isDemo = usage?.isDemoAccount ?? false
  // Only offer editing once we know this isn't the read-only demo account (avoids a flash of buttons that would fail).
  const canEdit = usage !== undefined && !usage.isDemoAccount
  const blocked = isDemo
    ? 'This is the demo account. It runs on sample data, so live scans are off.'
    : usage && !usage.serviceAvailable
      ? 'Scanning is paused: the free scan budget for this app is used up.'
      : usage?.nextScanAt && !usage.canScan
        ? `Daily limit reached. Next scan ${formatDate(usage.nextScanAt)}.`
        : null

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-16 px-5 pt-8 pb-20 md:gap-24 md:px-8 md:pt-14">
      <section className="grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-end md:gap-12">
        <div className="rise">
          <h1 className="heading text-5xl leading-none md:text-7xl">
            Your <strong>skin</strong>
          </h1>
          <p className="mt-4 max-w-sm text-lg text-white/75">
            {scans === undefined
              ? ' '
              : scans.length === 0
                ? 'No scans yet. Start with one today.'
                : `${scans.length} scan${scans.length === 1 ? '' : 's'} so far, tracking ${products?.length ?? 0} product${products?.length === 1 ? '' : 's'}.`}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            {usage?.canScan && (
              <Link to="/scan" className={buttonVariants({ size: 'lg' })}>
                New scan
              </Link>
            )}
            {canEdit && <ArrowLink to="/products/new">Add a product</ArrowLink>}
          </div>
          {blocked && <p className="mt-6 max-w-sm border-l-2 border-taupe pl-4 text-sm text-white/75">{blocked}</p>}
        </div>
        <div className="rise" style={{ '--i': 1 } as React.CSSProperties}>
          <LatestScanPanel scan={latestScan} />
        </div>
      </section>

      <section className="flex flex-col gap-7">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="heading text-4xl md:text-5xl">
              Your <strong>products</strong>
            </h2>
            <p className="mt-2 text-white/70">Each one is judged on the skin concern it targets.</p>
          </div>
          {canEdit && products && products.length > 0 && (
            <span className="hidden md:block">
              <ArrowLink to="/products/new">Add a product</ArrowLink>
            </span>
          )}
        </div>

        {products === undefined ? (
          <div className="grid gap-5 md:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="panel aspect-[4/5] animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="grid gap-5 md:grid-cols-3">
            <Link
              to="/products/new"
              className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-lg p-6"
            >
              <img
                src={productImage(0)}
                alt=""
                className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
              <h3 className="text-2xl font-light">
                Add your first <strong className="font-bold">product</strong>
              </h3>
              <p className="mt-1 text-sm text-white/80">The serum, cream or cleanser you want to test.</p>
            </Link>
            <ol className="panel flex flex-col justify-center gap-px overflow-hidden md:col-span-2">
              {[
                ['Scan', 'Take a scan today, before you start the product. Two scans before starting is best.'],
                ['Add', 'Add the product and the one concern it promises to improve.'],
                ['Repeat', `Scan once a week. After ${VERDICT_CONFIG.minDaysSinceStart} days you get a verdict you can trust.`],
              ].map(([term, text], index) => (
                <li key={term} className="grid grid-cols-[3rem_1fr] items-baseline gap-4 border-b border-white/10 px-6 py-6 last:border-b-0 md:px-10">
                  <span className="text-4xl font-medium tabular-nums text-taupe">{index + 1}</span>
                  <span>
                    <strong className="text-lg font-bold">{term}</strong>
                    <span className="mt-1 block text-white/75">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0">
            {products.map((product, index) => (
              <ProductCard
                key={product._id}
                id={product._id}
                rank={productRank(products, product._id)}
                name={product.name}
                concernLabel={isConcernKey(product.targetConcern) ? CONCERNS[product.targetConcern].label : product.targetConcern}
                startDate={product.startDate}
                now={now}
                verdict={verdictByProduct.get(product._id)?.verdict ?? null}
                index={index + 2}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid overflow-hidden rounded-lg md:grid-cols-2">
        <img src="/images/dropper-skin.jpg" alt="" className="h-64 w-full object-cover md:h-full" />
        <div className="bg-card p-7 md:p-12">
          <h2 className="heading text-4xl">
            How the <strong>verdict</strong> works
          </h2>
          <p className="mt-3 text-white/70">No guessing. Every verdict comes from your own numbers.</p>
          <dl className="mt-8 flex flex-col divide-y divide-white/10">
            {RULES.map((rule) => (
              <div key={rule.term} className="grid gap-1 py-4 sm:grid-cols-[8rem_1fr] sm:gap-6">
                <dt className="font-bold">{rule.term}</dt>
                <dd className="text-white/75">{rule.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="relative isolate overflow-hidden rounded-lg px-6 py-14 md:px-12 md:py-20">
        <img src="/images/skin-texture.jpg" alt="" className="absolute inset-0 -z-20 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy via-navy/75 to-navy/20" />
        <h2 className="heading max-w-lg text-4xl">
          Your photos are <strong>never stored</strong>
        </h2>
        <p className="mt-4 max-w-md text-white/80">Each photo is analysed, then thrown away. Receipts keeps the scores and nothing else.</p>
      </section>
    </main>
  )
}
