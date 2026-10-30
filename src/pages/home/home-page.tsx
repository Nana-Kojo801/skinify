import { CaretRight, Info, Plus, ScanSmiley, Warning } from '@phosphor-icons/react'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { IdeasToTest } from '@/components/ideas-to-test'
import { NextScanDue } from '@/components/next-scan-due'
import { Reveal } from '@/components/reveal'
import { buttonVariants } from '@/components/ui/button'
import { daysBetween, formatDate, formatPoints, formatSigned } from '@/lib/format'
import { productImage, productRank } from '@/lib/product-image'
import { VERDICT_STYLE } from '@/lib/verdict-display'
import { CONCERNS, isConcernKey } from '@shared/concerns'
import { joinNames, overlapMap } from '@shared/products/overlap'
import { VERDICT_CONFIG } from '@shared/verdict/verdict-config'
import type { Verdict, VerdictInputs } from '@shared/verdict/verdict-types'
import { api } from '../../../convex/_generated/api'
import { LatestScanCard } from './components/latest-scan-card'
import { MilestoneCelebration } from './components/milestone-celebration'
import { RhythmCard } from './components/rhythm-card'
import { SkinOverview } from './components/skin-overview'
import { useRhythm } from './use-rhythm'
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

const concernLabel = (key: string) => (isConcernKey(key) ? CONCERNS[key].label : key)

/** The one number that explains a verdict on a product card. */
function verdictStat(verdict: Verdict, inputs: VerdictInputs): string | null {
  switch (verdict) {
    case 'WORKING':
    case 'NO_VISIBLE_CHANGE':
      return inputs.change === null ? null : formatSigned(inputs.change)
    case 'CANT_TELL':
      return `±${formatPoints(inputs.noise)}`
    case 'POSSIBLE_IRRITATION':
      return inputs.worsening ? formatSigned(-inputs.worsening.amount) : null
    case 'TOO_EARLY':
      return null
  }
}

export function HomePage() {
  const products = useQuery(api.products.list)
  const verdicts = useQuery(api.verdicts.latestForAll)
  const latestScan = useQuery(api.scans.latest)
  const scans = useQuery(api.scans.list)
  const usage = useQuery(api.scans.usage)
  const firstWorking = useQuery(api.milestones.firstWorking)
  const [now] = useState(() => Date.now())

  const overlaps = overlapMap(products ?? [], now)
  const verdictByProduct = new Map(verdicts?.map((entry) => [entry.productId, entry.verdict]))
  const isDemo = usage?.isDemoAccount ?? false
  // Only offer editing once we know this isn't the read-only demo account (avoids a flash of buttons that would fail).
  const canEdit = usage !== undefined && !usage.isDemoAccount
  const canScan = usage?.canScan ?? false
  const blocked = isDemo
    ? 'This is the demo account. It runs on sample data, so live scans are off.'
    : usage && !usage.serviceAvailable
      ? 'Scanning is paused: the free scan budget for this app is used up.'
      : usage?.nextScanAt && !usage.canScan
        ? `Daily limit reached. Next scan ${formatDate(usage.nextScanAt)}.`
        : null

  // One highlight for the home page: a possible irritation first (it needs attention), else a product that works.
  const insight = (() => {
    if (!products) return null
    const rows = products.map((product) => ({ product, row: verdictByProduct.get(product._id) ?? null }))
    const irritated = rows.find(({ row }) => row?.verdict === 'POSSIBLE_IRRITATION')
    if (irritated?.row?.inputs.worsening) {
      const { concern, amount } = irritated.row.inputs.worsening
      return {
        tone: 'irritation' as const,
        product: irritated.product,
        title: `${irritated.product.name} may be irritating your skin.`,
        text: `${concernLabel(concern)} got worse by about ${formatPoints(amount)} points.`,
      }
    }
    const working = rows.find(({ row }) => row?.verdict === 'WORKING')
    if (working?.row && working.row.inputs.improvement !== null) {
      return {
        tone: 'working' as const,
        product: working.product,
        title: `${working.product.name} is working.`,
        text: `${concernLabel(working.product.targetConcern)} is up ${formatPoints(working.row.inputs.improvement)} points since you started it.`,
      }
    }
    return null
  })()

  const { streak, milestones } = useRhythm({
    scanTimes: (scans ?? []).map((scan) => scan.createdAt),
    products: products ?? [],
    firstWorking: firstWorking ?? null,
    now,
  })
  const rhythmReady = scans !== undefined && products !== undefined && firstWorking !== undefined

  const today = new Date(now).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <main className="mx-auto flex max-w-6xl flex-col px-4 pt-1.5 md:px-8 md:pt-10">
      <section className="rise flex flex-wrap items-end justify-between gap-4 px-1">
        <div>
          <p className="text-sm font-medium text-muted">{today}</p>
          <h1 className="mt-1 text-[36px] leading-[1.05] font-semibold tracking-[-0.035em] md:text-5xl">Your skin</h1>
          <p className="mt-1.5 text-muted md:text-[17px]">
            {scans === undefined
              ? ' '
              : scans.length === 0
                ? 'No scans yet. Start with one today.'
                : `${scans.length} scan${scans.length === 1 ? '' : 's'} so far, tracking ${products?.length ?? 0} product${products?.length === 1 ? '' : 's'}.`}
          </p>
          <NextScanDue className="mt-3" />
        </div>
        <div className="hidden gap-2.5 md:flex">
          {canScan && (
            <Link to="/scan" className={buttonVariants({ size: 'lg' })}>
              <ScanSmiley size={20} />
              New scan
            </Link>
          )}
          {canEdit && (
            <Link to="/products/new" className={buttonVariants({ variant: 'soft', size: 'lg' })}>
              <Plus size={18} />
              Add a product
            </Link>
          )}
        </div>
      </section>

      {rhythmReady && <MilestoneCelebration milestones={milestones} currentStreak={streak.weeks} now={now} />}

      {blocked && (
        <p className="rise mt-4 flex items-start gap-2.5 rounded-2xl bg-sand px-4 py-3 text-sm text-cocoa-soft" style={{ '--i': 1 } as React.CSSProperties}>
          <Info size={18} className="mt-px shrink-0" />
          {blocked}
        </p>
      )}

      <div className="mt-5 grid gap-4 md:mt-8 md:grid-cols-[1.4fr_1fr] md:gap-6">
        <div className="rise" style={{ '--i': 1 } as React.CSSProperties}>
          <LatestScanCard scan={latestScan} canScan={canScan} />
          {rhythmReady && (
            <div className="mt-4 md:mt-6">
              <RhythmCard streak={streak} milestones={milestones} />
            </div>
          )}
          {latestScan && (
            <div className="mt-4 md:mt-6">
              <SkinOverview scans={scans} />
            </div>
          )}
          {latestScan && (
            <div className="mt-4 md:mt-6">
              <IdeasToTest scores={latestScan.scores} qualityFlag={latestScan.qualityFlag} products={products} canCreate={canEdit} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4 md:gap-6">
          {insight && (
            <Link
              to={`/products/${insight.product._id}`}
              className={`rise press flex items-center gap-3.5 rounded-3xl py-3.5 pr-4 pl-3.5 ${insight.tone === 'working' ? `bg-working-bg text-[#234f37] ${VERDICT_STYLE.WORKING.depth}` : `bg-irritation-bg text-irritation-ink ${VERDICT_STYLE.POSSIBLE_IRRITATION.depth}`}`}
              style={{ '--i': 2 } as React.CSSProperties}
            >
              {insight.tone === 'working' ? (
                <img src={productImage(productRank(products ?? [], insight.product._id))} alt="" className="size-[52px] shrink-0 rounded-2xl object-cover shadow-[0_6px_14px_-6px_rgb(46_36_32/0.45)]" />
              ) : (
                <span className="grid size-[52px] shrink-0 place-items-center rounded-2xl bg-white/70">
                  <Warning size={24} />
                </span>
              )}
              <span className="flex-1 text-[14.5px] leading-snug">
                <strong className="font-bold">{insight.title}</strong> {insight.text}
              </span>
              <CaretRight size={20} weight="bold" className="shrink-0" />
            </Link>
          )}
          <Reveal className="hidden flex-col gap-2.5 md:flex">
            <HowItWorks />
          </Reveal>
        </div>
      </div>

      <section className="mt-9 md:mt-14">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[22px] font-semibold tracking-[-0.02em] md:text-[28px]">Your products</h2>
          {canEdit && products && products.length > 0 && (
            <Link to="/products/new" className={buttonVariants({ variant: 'soft', size: 'sm', className: 'md:hidden' })}>
              <Plus size={16} weight="bold" />
              Add
            </Link>
          )}
        </div>
        <p className="mt-1 px-1 text-[15px] text-muted">Each one is judged on the skin concern it targets.</p>

        {products === undefined ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3 md:gap-5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-[116px] md:h-80" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1fr] md:gap-5">
            {canEdit ? (
              <Link to="/products/new" className="card press group relative flex min-h-56 flex-col justify-end overflow-hidden p-5 text-white">
                <img src="/images/product-pour.webp" alt="" className="absolute inset-0 -z-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <span className="absolute inset-0 bg-linear-to-t from-cocoa/75 via-cocoa/10 to-transparent" />
                <span className="relative">
                  <span className="mb-3 grid size-11 place-items-center rounded-full bg-white text-cocoa">
                    <Plus size={20} weight="bold" />
                  </span>
                  <span className="block text-xl font-semibold tracking-[-0.02em]">Add your first product</span>
                  <span className="text-sm opacity-90">The serum, cream or cleanser you want to test.</span>
                </span>
              </Link>
            ) : (
              <p className="card p-5 text-muted">No products yet.</p>
            )}
            <ol className="card flex flex-col justify-center px-5 py-2">
              {[
                ['Scan', 'Take a scan today, before you start the product. Two scans before starting is best.'],
                ['Add', 'Add the product and the one concern it promises to improve.'],
                ['Repeat', `Scan once a week. After ${VERDICT_CONFIG.minDaysSinceStart} days you get a verdict you can trust.`],
              ].map(([term, text], index) => (
                <li key={term} className="flex gap-4 border-b border-line py-4 last:border-b-0">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sand font-bold text-coral-ink">{index + 1}</span>
                  <span>
                    <strong className="font-semibold">{term}</strong>
                    <span className="mt-0.5 block text-sm text-muted">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-3 md:gap-5">
            {products.map((product, index) => {
              const row = verdictByProduct.get(product._id) ?? null
              const started = product.startDate <= now
              const day = daysBetween(product.startDate, now)
              const trend = (scans ?? []).flatMap((scan) => (scan.scores[product.targetConcern] === undefined ? [] : [scan.scores[product.targetConcern]])).slice(-8)
              return (
                <Reveal as="li" key={product._id} index={index}>
                  <ProductCard
                    id={product._id}
                    image={productImage(productRank(products, product._id))}
                    name={product.name}
                    meta={`${concernLabel(product.targetConcern)} · ${started ? `day ${day}` : 'starts soon'}`}
                    verdict={row?.verdict ?? null}
                    stat={row ? verdictStat(row.verdict, row.inputs) : null}
                    trend={trend}
                    index={index}
                    overlapsWith={overlaps.has(product._id) ? joinNames(overlaps.get(product._id)!.map((o) => o.name)) : undefined}
                  />
                </Reveal>
              )
            })}
          </ul>
        )}
      </section>

      <Reveal as="section" className="mt-9 flex flex-col gap-2.5 md:hidden">
        <HowItWorks />
      </Reveal>

      <Reveal as="section" className="photo relative mt-4 h-[180px] overflow-hidden rounded-(--radius-card) md:mt-14 md:h-[260px]">
        <img src="/images/dropper-skin.webp" alt="" loading="lazy" className="size-full object-cover object-[50%_40%]" />
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-b from-transparent to-cocoa/75 px-5 pt-10 pb-[18px] text-white md:px-8 md:pb-7">
          <p className="text-xl font-semibold tracking-[-0.02em] md:text-3xl">Your photos are never stored</p>
          <p className="mt-0.5 text-[13.5px] opacity-90 md:text-base">Each photo is analysed, then thrown away. Receipts keeps the scores and nothing else.</p>
        </div>
      </Reveal>
    </main>
  )
}

function HowItWorks() {
  return (
    <>
      <h2 className="px-1 text-[22px] font-semibold tracking-[-0.02em] md:text-xl">How the verdict works</h2>
      <div className="grid grid-cols-2 gap-2.5">
        {RULES.map((rule) => (
          <div key={rule.term} className="tile p-4">
            <p className="font-bold">{rule.term}</p>
            <p className="mt-1 text-[13.5px] leading-snug text-muted">{rule.text}</p>
          </div>
        ))}
      </div>
    </>
  )
}
