import { ArrowRight, CaretRight, Info, Plus, ScanSmiley, Sparkle, Warning } from '@phosphor-icons/react'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { IdeasToTest } from '@/components/ideas-to-test'
import { NextScanDue } from '@/components/next-scan-due'
import { Reveal } from '@/components/reveal'
import { buttonVariants } from '@/components/ui/button'
import { daysBetween, formatDate, formatPoints, formatSigned } from '@/lib/format'
import { productImage, productRank } from '@/lib/product-image'
import { cn } from '@/lib/utils'
import { VERDICT_STYLE } from '@/lib/verdict-display'
import { CONCERNS, isConcernKey } from '@shared/concerns'
import { joinNames, overlapMap } from '@shared/products/overlap'
import { VERDICT_CONFIG } from '@shared/verdict/verdict-config'
import type { Verdict, VerdictInputs } from '@shared/verdict/verdict-types'
import { api } from '../../../convex/_generated/api'
import { LatestScanCard } from './components/latest-scan-card'
import { MilestoneCelebration } from './components/milestone-celebration'
import { ProductCard } from './components/product-card'
import { MilestonesCard, RhythmCard } from './components/rhythm-card'
import { SkinOverview } from './components/skin-overview'
import { useRhythm } from './use-rhythm'

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

/** The one number that explains a verdict on a product card, and what it measures. */
function verdictStat(verdict: Verdict, inputs: VerdictInputs): { stat: string; label: string } | null {
  switch (verdict) {
    case 'WORKING':
    case 'NO_VISIBLE_CHANGE':
      return inputs.change === null ? null : { stat: formatSigned(inputs.change), label: 'points since start' }
    case 'CANT_TELL':
      return { stat: `±${formatPoints(inputs.noise)}`, label: 'noise between photos' }
    case 'POSSIBLE_IRRITATION':
      return inputs.worsening ? { stat: formatSigned(-inputs.worsening.amount), label: `points of ${concernLabel(inputs.worsening.concern).toLowerCase()}` } : null
    case 'TOO_EARLY':
      return null
  }
}

function SectionHeading({ title, aside, id }: { title: string; aside?: React.ReactNode; id?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1.5 pt-9 pb-3 md:pt-12">
      <h2 id={id} className="display text-[25px] leading-none md:text-[28px]">
        {title}
      </h2>
      {aside}
    </div>
  )
}

export function HomePage() {
  const products = useQuery(api.products.list)
  const verdicts = useQuery(api.verdicts.latestForAll)
  const latestScan = useQuery(api.scans.latest)
  const scans = useQuery(api.scans.list)
  const usage = useQuery(api.scans.usage)
  const me = useQuery(api.account.me)
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
  const noScans = latestScan === null

  const today = new Date(now).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <main className="mx-auto flex max-w-[1180px] flex-col px-3 pt-[max(12px,env(safe-area-inset-top))] md:px-10 md:pt-10">
      <header className="rise flex items-end justify-between gap-4 px-2">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink-2 md:text-base">{today}</p>
          <h1 className="display mt-1 text-[40px] leading-none md:text-[60px]">Your skin</h1>
          <p className="mt-2 text-[15px] text-ink-2 md:text-base">
            {scans === undefined
              ? ' '
              : scans.length === 0
                ? 'No scans yet. Start with one today.'
                : `${scans.length} scan${scans.length === 1 ? '' : 's'} so far, tracking ${products?.length ?? 0} product${products?.length === 1 ? '' : 's'}.`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {canEdit && (
            <Link to="/products/new" className={cn(buttonVariants({ variant: 'soft', size: 'lg' }), 'hidden md:inline-flex')}>
              <Plus size={18} weight="bold" />
              Add a product
            </Link>
          )}
          <Link
            to="/settings"
            aria-label="Settings"
            className="press grid size-11 place-items-center rounded-full bg-[image:var(--sheen)] bg-accent text-lg font-extrabold shadow-(--shadow-depth-color) md:hidden"
          >
            {me?.email?.charAt(0).toUpperCase() ?? ' '}
          </Link>
        </div>
      </header>

      <div className="mt-4 flex flex-col gap-2.5 md:mt-6 md:gap-3.5">
        {rhythmReady && <MilestoneCelebration milestones={milestones} currentStreak={streak.weeks} now={now} />}
        {blocked && (
          <p className={cn('rise flex items-start gap-2.5 rounded-[20px] bg-well px-4 py-3 text-sm font-medium text-ink-2', !noScans && 'md:hidden')} style={{ '--i': 1 } as React.CSSProperties}>
            <Info size={18} weight="bold" className="mt-px shrink-0" />
            {blocked}
          </p>
        )}
      </div>

      {noScans ? (
        <div className="mt-3 grid gap-3 md:mt-6 md:grid-cols-12 md:items-start md:gap-3.5">
          <GettingStarted canScan={canScan} className="rise md:col-span-7" />
          <div className="md:col-span-5">{products?.length === 0 && <NoProducts canEdit={canEdit} />}</div>
        </div>
      ) : (
        <>
          <SectionHeading
            title="Latest scan"
            aside={
              latestScan ? (
                <span className="hidden text-[15px] font-semibold text-ink-2 md:inline">
                  {new Date(latestScan.createdAt).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              ) : undefined
            }
          />
          <div className="grid gap-2.5 md:grid-cols-12 md:items-start md:gap-3.5">
            <div className="rise md:col-span-7 md:self-stretch" style={{ '--i': 1 } as React.CSSProperties}>
              <LatestScanCard scan={latestScan} />
            </div>
            <div className="flex flex-col gap-2.5 md:col-span-5 md:gap-3.5">
              <div className="flex flex-col gap-2.5 md:gap-3.5">
                {rhythmReady && <RhythmCard streak={streak} className="rise" />}
                <NextScanDue variant="tile" className="rise" />
              </div>
              {blocked && (
                <p className="tile-accent-2 rise hidden items-start gap-3 p-5 text-[14.5px] leading-snug font-semibold md:flex" style={{ '--i': 2 } as React.CSSProperties}>
                  <Info size={20} weight="bold" className="mt-0.5 shrink-0" />
                  {blocked}
                </p>
              )}
              {insight && (
                <Link
                  to={`/products/${insight.product._id}`}
                  className={cn(
                    'rise press flex items-center gap-3.5 rounded-(--radius-tile) py-2.5 pr-4 pl-2.5',
                    insight.tone === 'working' ? 'tile' : VERDICT_STYLE.POSSIBLE_IRRITATION.tile,
                  )}
                  style={{ '--i': 3 } as React.CSSProperties}
                >
                  {insight.tone === 'working' ? (
                    <img
                      src={productImage(productRank(products ?? [], insight.product._id))}
                      alt=""
                      className="size-[76px] shrink-0 rounded-[22px] object-cover shadow-[0_8px_16px_-8px_rgb(20_40_80/0.45)] md:size-[88px]"
                    />
                  ) : (
                    <span className="grid size-[76px] shrink-0 place-items-center rounded-[22px] bg-white/70 md:size-[88px]">
                      <Warning size={30} weight="bold" />
                    </span>
                  )}
                  <span className={cn('flex-1 text-[14.5px] leading-snug', insight.tone === 'working' && 'text-ink-2')}>
                    <strong className={cn('mb-1 block text-[18px] leading-tight font-extrabold tracking-[-0.02em] md:text-[21px]', insight.tone === 'working' && 'text-ink')}>
                      {insight.title}
                    </strong>
                    {insight.text}
                  </span>
                  <CaretRight size={20} weight="bold" className="shrink-0 opacity-50" />
                </Link>
              )}
            </div>
          </div>

          {latestScan && (
            <>
              <SectionHeading title="Skin overview" aside={<span className="text-[14px] font-semibold text-ink-2">{Object.keys(latestScan.scores).length} areas</span>} />
              <div className="flex flex-col gap-2.5 md:gap-3.5">
                <Reveal>
                  <SkinOverview scans={scans} />
                </Reveal>
                <Reveal index={1}>
                  <IdeasToTest scores={latestScan.scores} qualityFlag={latestScan.qualityFlag} products={products} canCreate={canEdit} />
                </Reveal>
              </div>
            </>
          )}
        </>
      )}

      {(products === undefined || products.length > 0 || !noScans) && (
        <section aria-labelledby="products-title">
          <SectionHeading
            id="products-title"
            title="Your products"
            aside={
              canEdit && products && products.length > 0 ? (
                <Link to="/products/new" className={cn(buttonVariants({ variant: 'soft', size: 'sm' }), 'md:hidden')}>
                  <Plus size={16} weight="bold" />
                  Add
                </Link>
              ) : undefined
            }
          />
          <p className="-mt-1 mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1.5 text-[14.5px] text-ink-2">
            Each one is judged on the skin concern it targets.
            {scans && scans.length > 0 && (
              <Link to="/report" className="press inline-flex min-h-11 items-center gap-1 font-bold text-ink">
                Make a report to share
                <ArrowRight size={16} weight="bold" />
              </Link>
            )}
          </p>

          {products === undefined ? (
            <div className="grid gap-2.5 md:grid-cols-3 md:gap-3.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-[156px] md:h-[330px]" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <NoProducts canEdit={canEdit} />
          ) : (
            <ul className="grid gap-2.5 md:grid-cols-3 md:gap-3.5">
              {products.map((product, index) => {
                const row = verdictByProduct.get(product._id) ?? null
                const started = product.startDate <= now
                const day = daysBetween(product.startDate, now)
                const trend = (scans ?? []).flatMap((scan) => (scan.scores[product.targetConcern] === undefined ? [] : [scan.scores[product.targetConcern]])).slice(-8)
                const stat = row ? verdictStat(row.verdict, row.inputs) : null
                return (
                  <Reveal as="li" key={product._id} index={index}>
                    <ProductCard
                      id={product._id}
                      image={productImage(productRank(products, product._id))}
                      name={product.name}
                      meta={`${concernLabel(product.targetConcern)} · ${started ? `day ${day}` : 'starts soon'}`}
                      verdict={row?.verdict ?? null}
                      stat={stat?.stat ?? null}
                      statLabel={stat?.label ?? null}
                      trend={trend}
                      overlapsWith={overlaps.has(product._id) ? joinNames(overlaps.get(product._id)!.map((o) => o.name)) : undefined}
                    />
                  </Reveal>
                )
              })}
            </ul>
          )}
        </section>
      )}

      <div className="grid gap-x-3.5 md:grid-cols-12 md:items-start">
        {rhythmReady && streak.lastScanAt !== null && (
          <section className="md:col-span-5" aria-labelledby="rhythm-list-title">
            <SectionHeading id="rhythm-list-title" title="Your rhythm" />
            <Reveal>
              <MilestonesCard milestones={milestones} />
            </Reveal>
          </section>
        )}
        <section className={rhythmReady && streak.lastScanAt !== null ? 'md:col-span-7' : 'md:col-span-12'} aria-labelledby="rules-title">
          <SectionHeading id="rules-title" title="How the verdict works" />
          <div className="grid grid-cols-2 gap-2.5 md:gap-3.5">
            {RULES.map((rule, index) => (
              <Reveal key={rule.term} index={index} className="tile p-4 md:p-5">
                <p className="font-extrabold">{rule.term}</p>
                <p className="mt-1 text-[13.5px] leading-snug text-ink-2">{rule.text}</p>
              </Reveal>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function GettingStarted({ canScan, className }: { canScan: boolean; className?: string }) {
  return (
    <section className={cn('tile-accent p-5 md:p-7', className)} aria-labelledby="start-title">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">
          <Sparkle size={16} weight="fill" />
          Getting started
        </p>
        <svg viewBox="0 0 210 270" className="facemap h-[110px] shrink-0 text-ink" aria-hidden>
          <ellipse cx="105" cy="128" rx="78" ry="104" />
          <path d="M60 104q18-10 34 0M116 104q18-10 34 0M98 150q7 8 14 0M78 190q27 16 54 0" />
          <circle cx="62" cy="160" r="5" />
          <circle cx="105" cy="58" r="5" />
          <circle cx="150" cy="150" r="5" />
        </svg>
      </div>
      <h2 id="start-title" className="display -mt-6 max-w-[14ch] text-[30px] leading-[1.05] md:text-[36px]">
        Your first scan sets your baseline
      </h2>
      <ol className="mt-5 flex flex-col gap-2">
        {[
          ['Scan', 'Take a scan today, before you start the product. Two scans before starting is best.'],
          ['Add', 'Add the product and the one concern it promises to improve.'],
          ['Repeat', `Scan once a week. After ${VERDICT_CONFIG.minDaysSinceStart} days you get a verdict you can trust.`],
        ].map(([term, text], index) => (
          <li key={term} className="pop-in flex items-start gap-3 rounded-[18px] bg-white/55 p-3 text-[14px] leading-snug" style={{ '--i': index + 2 } as React.CSSProperties}>
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-extrabold text-accent">{index + 1}</span>
            <span>
              <strong className="block font-extrabold">{term}</strong>
              {text}
            </span>
          </li>
        ))}
      </ol>
      {canScan && (
        <Link to="/scan" className={cn(buttonVariants({ size: 'lg' }), 'mt-4 w-full')}>
          <ScanSmiley size={20} weight="bold" />
          New scan
        </Link>
      )}
    </section>
  )
}

function NoProducts({ canEdit }: { canEdit: boolean }) {
  return (
    <div className="tile flex flex-col items-start gap-2 p-6">
      <span className="grid size-11 place-items-center rounded-[14px] bg-accent-2">
        <Plus size={22} weight="bold" />
      </span>
      <h3 className="mt-1 text-[21px] font-extrabold tracking-[-0.02em]">No products yet</h3>
      <p className="text-[14.5px] text-ink-2">Add the serum, cream or cleanser you want to test, and the day you start it.</p>
      {canEdit && (
        <Link to="/products/new" className={cn(buttonVariants({ variant: 'soft' }), 'mt-2')}>
          <Plus size={18} weight="bold" />
          Add your first product
        </Link>
      )}
    </div>
  )
}
