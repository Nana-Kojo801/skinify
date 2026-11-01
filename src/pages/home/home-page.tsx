import { ArrowRight, CaretRight, Info, Plus, Camera } from '@phosphor-icons/react'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { Link } from 'react-router'
import { IdeasToTest } from '@/components/ideas-to-test'
import { NextScanDue } from '@/components/next-scan-due'
import { ScoreChart } from '@/components/score-chart'
import { Sparkline } from '@/components/sparkline'
import { buttonVariants } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { toggleVariants } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { cn } from '@/lib/utils'
import { daysBetween, formatDate, formatShortDate, formatSigned } from '@/lib/format'
import { VERDICT_LABELS } from '@/lib/verdict-display'
import { CONCERNS, CONCERN_KEYS, isConcernKey, type ConcernKey } from '@shared/concerns'
import { overlapMap, joinNames } from '@shared/products/overlap'
import { VERDICT_CONFIG } from '@shared/verdict/verdict-config'
import { api } from '../../../convex/_generated/api'
import { MilestoneCelebration } from './components/milestone-celebration'
import { MilestonesCard, RhythmCard } from './components/rhythm-card'
import { SkinOverview } from './components/skin-overview'
import { useRhythm } from './use-rhythm'

const RANGES = [
  { value: '6', label: 'Last 6 weeks' },
  { value: '12', label: 'Last 12 weeks' },
  { value: 'all', label: 'All time' },
]

export function HomePage({ routineOnly = false }: { routineOnly?: boolean }) {
  const products = useQuery(api.products.list)
  const verdicts = useQuery(api.verdicts.latestForAll)
  const scans = useQuery(api.scans.list)
  const usage = useQuery(api.scans.usage)
  const firstWorking = useQuery(api.milestones.firstWorking)
  const [now] = useState(() => Date.now())
  const [concern, setConcern] = useState<ConcernKey>('acne')
  const [range, setRange] = useState('6')
  const [moreConcerns, setMoreConcerns] = useState(false)
  const canEdit = usage !== undefined && !usage.isDemoAccount
  const canScan = usage?.canScan ?? false
  const ordered = [...(scans ?? [])].sort((a, b) => a.createdAt - b.createdAt)
  const latest = ordered.at(-1)
  const points = ordered.filter(s => s.scores[concern] !== undefined && (range === 'all' || s.createdAt >= now - Number(range) * 7 * 86400000)).map(s => ({ createdAt: s.createdAt, score: s.scores[concern], flagged: s.qualityFlag }))
  const baseline = ordered.find(s => !s.qualityFlag && s.scores[concern] !== undefined)?.scores[concern]
  const score = latest?.scores[concern]
  const change = score != null && baseline != null ? score - baseline : null
  const byProduct = new Map(verdicts?.map(v => [v.productId, v.verdict]))
  const overlaps = overlapMap(products ?? [], now)
  const { streak, milestones } = useRhythm({ scanTimes: ordered.map(s => s.createdAt), products: products ?? [], firstWorking: firstWorking ?? null, now })
  const ready = scans !== undefined && products !== undefined && firstWorking !== undefined
  const highlighted = products?.find(p => byProduct.get(p._id)?.verdict === 'POSSIBLE_IRRITATION') ?? products?.find(p => byProduct.get(p._id)?.verdict === 'WORKING')
  const observation = highlighted && byProduct.get(highlighted._id)
  const notice = usage?.isDemoAccount ? 'Sample account · Explore the results. Live scans and editing are off.' : usage && !usage.serviceAvailable ? 'Scanning is paused: the app’s free scan budget is used up.' : usage?.nextScanAt && !canScan ? `Daily limit reached. Next scan ${formatDate(usage.nextScanAt)}.` : null
  return (
    <main className="screen overview-page">
      <PageHeader
        actions={routineOnly ? canEdit && <Link to="/products/new" className={buttonVariants()}><Plus size={18} />Add product</Link> : canScan && <Link className={`${buttonVariants()} desktop-scan-action`} to="/scan">Take weekly scan</Link>}
      >
        <div className="title-with-control">
          <h1 className="page-title">{routineOnly ? 'Your routine' : 'Your skin'}</h1>
          {!routineOnly && (
            <NativeSelect aria-label="Chart period" value={range} onChange={e => setRange(e.target.value)} className="range-select">
              {RANGES.map(r => <NativeSelectOption key={r.value} value={r.value}>{r.label}</NativeSelectOption>)}
            </NativeSelect>
          )}
        </div>
      </PageHeader>
      {notice && <Alert role="status" className="mb-6"><Info size={16} />{notice}</Alert>}
      {!routineOnly && <>
        {scans === undefined ? <Skeleton className="h-72" aria-label="Loading scans" /> : !latest ? (
          <EmptyState
            icon={<Camera size={24} />}
            title="Your first scan starts the story."
            description="Take two photos, then add a product. Your weekly scans help you see what changes over time."
            action={canScan && <Link to="/scan" className={buttonVariants()}>Take your first scan</Link>}
          >
            <p className="text-xs text-ink-3">Two scans before starting a product make a better baseline.</p>
          </EmptyState>
        ) : <div className="overview-grid">
          <section className="overview-chart" aria-label="Skin progress">
            <ToggleGroup
              aria-label="Concern to plot"
              value={[concern]}
              onValueChange={next => { const key = next[0]; if (typeof key === 'string' && isConcernKey(key)) setConcern(key) }}
              className="concern-tabs"
            >
              {(moreConcerns ? CONCERN_KEYS : CONCERN_KEYS.slice(0, 4)).map(key => <ToggleGroupItem key={key} value={key}>{CONCERNS[key].label}</ToggleGroupItem>)}
              <button type="button" className={cn(toggleVariants(), 'shrink-0')} aria-expanded={moreConcerns} onClick={() => setMoreConcerns(v => !v)}>{moreConcerns ? 'Less' : 'More'}</button>
            </ToggleGroup>
            <div className="score-and-chart"><div className="hero-score"><strong>{score == null ? '—' : Math.round(score)}</strong><span>{change == null ? 'No comparison yet' : `${formatSigned(change)} since first scan`}</span>{latest.qualityFlag && <span className="text-canttell-ink">Latest scan: lower quality</span>}</div><ScoreChart points={points} baseline={baseline} label={`${CONCERNS[concern].label} score`} /></div>
          </section>
          <aside className="overview-aside"><h2>Weekly check-in</h2><NextScanDue className="overview-due" />{ready && <RhythmCard streak={streak} />}{highlighted && observation && <Link to={`/products/${highlighted._id}`} className="latest-observation"><span className="section-eyebrow">Latest observation <ArrowRight size={16} /></span><strong>{highlighted.name}</strong><p>{VERDICT_LABELS[observation.verdict]}. {observation.verdict === 'WORKING' ? 'The change is larger than your usual scan variation.' : 'Review the evidence before continuing.'}</p></Link>}</aside>
        </div>}
      </>}
      <section className="routine-section" aria-labelledby="routine-title"><div className="section-heading"><h2 id="routine-title">{routineOnly ? 'Products you’re tracking' : 'In your routine'}</h2>{canEdit && <Link to="/products/new" className="text-action"><Plus size={16} />Add product</Link>}</div>
        {products === undefined ? <Skeleton className="h-40" aria-label="Loading products" /> : products.length === 0 ? <EmptyState heading="h3" icon={<Plus size={24} />} title="No products yet" description="Add the product and the concern you want to track." action={canEdit && <Link to="/products/new" className={buttonVariants({ variant: 'outline' })}>Add your first product</Link>} /> : <div className="routine-table"><div className="routine-table-head"><span>#</span><span>Product</span><span>Concern</span><span>Started</span><span>Status</span><span>Weekly trend</span><span>Score</span><span /></div><ul>{products.map((p, i) => {
          const verdict = byProduct.get(p._id)
          const trend = ordered.flatMap(s => s.scores[p.targetConcern] == null ? [] : [s.scores[p.targetConcern]]).slice(-8)
          const label = isConcernKey(p.targetConcern) ? CONCERNS[p.targetConcern].label : p.targetConcern
          return <li key={p._id}><Link to={`/products/${p._id}`} className="routine-row"><span className="row-index">{String(i + 1).padStart(2, '0')}</span><span className="product-name"><span className="product-monogram">{p.name[0]?.toUpperCase()}</span><span><strong>{p.name}</strong><small>{p.startDate <= now ? `Day ${daysBetween(p.startDate, now)}` : 'Starts soon'}</small>{overlaps.has(p._id) && <small className="text-canttell-ink">Overlaps with {joinNames(overlaps.get(p._id)!.map(o => o.name))}</small>}</span></span><span className="product-concern">{label}</span><span className="product-date">{formatShortDate(p.startDate)}</span><span className={`product-status ${verdict?.verdict === 'POSSIBLE_IRRITATION' ? 'is-warning' : ''}`}><i className={verdict?.verdict === 'WORKING' ? 'is-working' : ''} />{verdict ? VERDICT_LABELS[verdict.verdict] : 'Awaiting scans'}</span><span className="product-trend"><Sparkline values={trend} color={verdict?.verdict === 'WORKING' ? 'var(--color-primary)' : '#929398'} width={110} height={24} /></span><span className="product-score">{trend.length ? Math.round(trend.at(-1)!) : '—'}</span><CaretRight size={16} /></Link></li>
        })}</ul></div>}
      </section>
      {!routineOnly && <>{canScan && <div className="mobile-scan-action"><Link to="/scan" className={buttonVariants({ size: 'lg' })}>Take weekly scan</Link>{latest && <p>Last scan {formatDate(latest.createdAt)}</p>}</div>}{latest && <Collapsible className="secondary-section"><CollapsibleTrigger>All scores & ideas to test<span>8 concerns</span></CollapsibleTrigger><CollapsibleContent><SkinOverview scans={scans} /><IdeasToTest scores={latest.scores} qualityFlag={latest.qualityFlag} products={products} canCreate={canEdit} /></CollapsibleContent></Collapsible>}</>}
      {ready && <Collapsible className="secondary-section"><CollapsibleTrigger>Your milestones<span>{streak.weeks} weeks</span></CollapsibleTrigger><CollapsibleContent><MilestonesCard milestones={milestones} /></CollapsibleContent></Collapsible>}
      <Collapsible className="secondary-section"><CollapsibleTrigger>How scoring works<span>Read the method</span></CollapsibleTrigger><CollapsibleContent><div className="method-copy"><p>We compare a product’s target concern before and after its start date. At least {VERDICT_CONFIG.minBaselineScans} baseline scans, {VERDICT_CONFIG.minPostScans} later scans and {VERDICT_CONFIG.minDaysSinceStart} days are needed.</p><p>A change must exceed {VERDICT_CONFIG.noiseMultiplier} times the variation between your paired photos. Scores are estimates, not a medical assessment.</p><Link to="/report" className="text-action">View your full report <ArrowRight size={16} /></Link></div></CollapsibleContent></Collapsible>
      {ready && <MilestoneCelebration milestones={milestones} currentStreak={streak.weeks} now={now} />}
    </main>
  )
}
