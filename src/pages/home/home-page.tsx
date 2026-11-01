import { ArrowRight, Info, Plus, ScanSmiley, Sparkle } from '@phosphor-icons/react'
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
  const noScans = latestScan === null

  const today = new Date(now).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <main className="journal-page">
      <header className="journal-heading rise">
        <div><p className="kicker">THE PERSONAL SKIN JOURNAL <span> / </span> {today}</p><h1 className="editorial-title">Small rituals.<br /><em>Visible evidence.</em></h1><p className="page-description">Your routine, with a little more perspective.</p></div>
        {canEdit && <Link to="/products/new" className={buttonVariants({ variant: 'outline' })}><Plus size={18} />Add a product</Link>}
      </header>
      <div className="journal-summary"><span><b>{scans?.length ?? '—'}</b> scans recorded</span><span><b>{products?.length ?? '—'}</b> products tracked</span><span><i className="status-dot" /> {latestScan ? `Last check-in ${formatDate(latestScan.createdAt)}` : 'Your story starts here'}</span></div>
      {rhythmReady && <div className="journal-milestone"><MilestoneCelebration milestones={milestones} currentStreak={streak.weeks} now={now} /></div>}
      {blocked && <p className="journal-notice"><Info size={17} />{blocked}</p>}
      {noScans ? <div className="journal-empty"><GettingStarted canScan={canScan} /></div> : <div className="journal-overview">
        <LatestScanCard scan={latestScan ?? undefined} />
        <aside className="journal-rail">
          {rhythmReady && <RhythmCard streak={streak} />}
          <NextScanDue variant="tile" />
          {insight && <Link to={`/products/${insight.product._id}`} className={cn('journal-insight', insight.tone === 'irritation' && 'is-warning')}><span className="kicker">A NOTE FROM YOUR SCANS</span><strong>{insight.title}</strong><p>{insight.text}</p><span className="text-link">See the evidence <ArrowRight size={16} /></span></Link>}
        </aside>
      </div>}
      <section className="journal-products" aria-labelledby="products-title">
        <div className="section-title"><div><p className="kicker">01 / THE ROUTINE</p><h2 id="products-title">Your product shelf</h2></div>{canEdit && <Link to="/products/new" className="text-link">Add product <Plus size={16} /></Link>}</div>
        {products === undefined ? <div className="skeleton h-56" /> : products.length === 0 ? <NoProducts canEdit={canEdit} /> : <ul className="product-ledger">{products.map((product, index) => {
          const row = verdictByProduct.get(product._id) ?? null
          const stat = row ? verdictStat(row.verdict, row.inputs) : null
          const trend = (scans ?? []).flatMap(scan => scan.scores[product.targetConcern] === undefined ? [] : [scan.scores[product.targetConcern]]).slice(-8)
          return <Reveal as="li" key={product._id} index={index}><ProductCard id={product._id} image={productImage(productRank(products, product._id))} name={product.name} meta={`${concernLabel(product.targetConcern)} · ${product.startDate <= now ? `day ${daysBetween(product.startDate, now)}` : 'starts soon'}`} verdict={row?.verdict ?? null} stat={stat?.stat ?? null} statLabel={stat?.label ?? null} trend={trend} overlapsWith={overlaps.has(product._id) ? joinNames(overlaps.get(product._id)!.map(o => o.name)) : undefined} /></Reveal>
        })}</ul>}
      </section>
      {latestScan && <section className="journal-analysis"><div className="section-title"><div><p className="kicker">02 / THE BIGGER PICTURE</p><h2>Your skin, over time</h2></div><Link to="/report" className="text-link">View report <ArrowRight size={16} /></Link></div><SkinOverview scans={scans} /><div className="journal-ideas"><IdeasToTest scores={latestScan.scores} qualityFlag={latestScan.qualityFlag} products={products} canCreate={canEdit} /></div></section>}
      <div className="journal-bottom">
        {rhythmReady && streak.lastScanAt !== null && <section><div className="section-title"><div><p className="kicker">03 / SHOWING UP</p><h2>Little milestones</h2></div></div><MilestonesCard milestones={milestones} /></section>}
        <section className="method-note"><div className="section-title"><div><p className="kicker">THE METHOD</p><h2>Evidence, explained.</h2></div></div><dl>{RULES.map((rule, i) => <div key={rule.term}><dt><span>0{i + 1}</span>{rule.term}</dt><dd>{rule.text}</dd></div>)}</dl></section>
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
          ['Repeat', `Scan once a week. After ${VERDICT_CONFIG.minDaysSinceStart} days we can begin checking for a measurable change.`],
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
