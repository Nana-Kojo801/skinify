import { ArrowRight, Drop } from '@phosphor-icons/react'
import { useQuery } from 'convex/react'
import { Link, useParams } from 'react-router'
import { BackLink } from '@/components/back-link'
import { CountUp } from '@/components/count-up'
import { PageSkeleton } from '@/components/page-skeleton'
import { Reveal } from '@/components/reveal'
import { buttonVariants } from '@/components/ui/button'
import { formatDate, formatSigned } from '@/lib/format'
import { useInView } from '@/lib/motion'
import { VERDICT_STYLE } from '@/lib/verdict-display'
import { cn } from '@/lib/utils'
import { CONCERN_KEYS, CONCERNS } from '@shared/concerns'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length
}

/** Two dots on the 1-100 scale joined by a bar: where the score was and where it is now. */
function Dumbbell({ before, after, color, thick = false }: { before: number; after: number; color: string; thick?: boolean }) {
  const [ref, inView] = useInView<HTMLDivElement>()
  const lo = Math.min(before, after)
  const hi = Math.max(before, after)
  return (
    <div ref={ref} className={cn('relative', thick ? 'h-5' : 'h-3')} aria-hidden>
      <div className={cn('absolute inset-x-0 rounded-full bg-ink/10', thick ? 'top-2 h-1' : 'top-[5px] h-0.5')} />
      <div
        className={cn('absolute rounded-full', thick ? 'top-2 h-1' : 'top-[5px] h-0.5')}
        style={{
          left: `${lo}%`,
          width: `${hi - lo}%`,
          background: color,
          transformOrigin: after >= before ? 'left' : 'right',
          transform: inView ? 'none' : 'scaleX(0)',
          transition: 'transform 1s var(--ease-liquid) .3s',
        }}
      />
      <div className={cn('absolute -translate-x-1/2 rounded-full bg-ink/25', thick ? 'top-[3px] size-3.5' : 'top-0.5 size-2')} style={{ left: `${before}%` }} />
      <div
        className={cn('absolute rounded-full border-2 border-white', thick ? 'top-0.5 size-4' : 'top-px size-2.5')}
        style={{
          left: `${after}%`,
          background: color,
          transform: `translateX(-50%) scale(${inView ? 1 : 0.3})`,
          opacity: inView ? 1 : 0,
          transition: 'transform .6s var(--ease-spring) 1s, opacity .3s ease 1s',
        }}
      />
    </div>
  )
}

const tone = (diff: number | null) => (diff === null || Number(diff.toFixed(1)) === 0 ? 'flat' : diff > 0 ? 'up' : 'down')
const TONE = {
  up: { panel: VERDICT_STYLE.WORKING.tile, line: 'var(--color-working)' },
  down: { panel: VERDICT_STYLE.POSSIBLE_IRRITATION.tile, line: 'var(--color-irritation)' },
  flat: { panel: 'tile text-ink', line: 'var(--color-ink)' },
}

// Before = average of the scans before the start date. After = average of the latest 2 scans from the start date on.
// Same definitions as the verdict engine (scans on the start day count as "before").
export function ComparePage() {
  const { id } = useParams()
  const productId = id as Id<'products'>
  const product = useQuery(api.products.get, { productId })
  const scans = useQuery(api.scans.list)
  const [targetRef, targetInView] = useInView<HTMLElement>()

  if (product === undefined || scans === undefined) return <PageSkeleton />
  if (product === null) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 pt-32 text-center md:pt-40">
        <span className="tile grid size-[92px] place-items-center rounded-[32px]" aria-hidden>
          <Drop size={40} />
        </span>
        <h1 className="display text-[32px] leading-[1.05] md:text-[48px]">Product not found</h1>
        <p className="text-[15.5px] text-ink-2">It may have been deleted, or the link is wrong.</p>
        <Link to="/" className={buttonVariants({ variant: 'soft', size: 'lg' })}>
          Back home
        </Link>
      </main>
    )
  }

  const dayEnd = product.startDate + 86_400_000
  const before = scans.filter((scan) => scan.createdAt < dayEnd)
  const after = scans.filter((scan) => scan.createdAt >= dayEnd).slice(-2)
  const rows = CONCERN_KEYS.map((key) => {
    const b = mean(before.flatMap((scan) => (scan.scores[key] === undefined ? [] : [scan.scores[key]])))
    const a = mean(after.flatMap((scan) => (scan.scores[key] === undefined ? [] : [scan.scores[key]])))
    return { key, label: CONCERNS[key].label, before: b, after: a, diff: b !== null && a !== null ? a - b : null }
  })
  const target = rows.find((row) => row.key === product.targetConcern)
  const others = rows.filter((row) => row.key !== product.targetConcern)
  const diffColor = (diff: number | null) =>
    diff === null || Number(diff.toFixed(1)) === 0 ? 'text-ink-3' : diff > 0 ? 'text-working-ink' : 'text-irritation-ink'

  const chips = (
    <div className="flex flex-wrap gap-2 text-[13px] font-bold">
      <span className="flex h-9 items-center gap-1.5 rounded-full bg-[image:var(--sheen)] bg-tile px-3.5 shadow-(--shadow-depth)">
        <i className="size-2.5 rounded-full bg-ink/25" />
        Before · {before.length} scan{before.length === 1 ? '' : 's'}
      </span>
      <span className="flex h-9 items-center gap-1.5 rounded-full bg-[image:var(--sheen)] bg-tile px-3.5 shadow-(--shadow-depth)">
        <i className="size-2.5 rounded-full bg-ink" />
        After · latest {after.length}
      </span>
    </div>
  )

  return (
    <main className="compare-page">
      <header className="flex h-14 items-center px-1">
        <BackLink to={`/products/${productId}`} label={product.name} />
      </header>

      <section className="rise mt-2 flex flex-col gap-3 px-2 md:mt-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="kicker mb-3">THE CHANGE / SIDE BY SIDE</p><h1 className="display text-[38px] leading-[1.02] md:text-[56px]">Before and after</h1>
          <p className="mt-2 text-[15.5px] text-ink-2 md:text-[17px]">
            {product.name}, started {formatDate(product.startDate)}. Scores run 1 to 100, higher is healthier.
          </p>
        </div>
        {chips}
      </section>

      {before.length === 0 || after.length === 0 ? (
        <p className="tile rise mt-6 p-6 text-[15px]" style={{ '--i': 1 } as React.CSSProperties}>
          {before.length === 0
            ? 'No scans from before the start date, so there is nothing to compare against.'
            : 'No scans after the start date yet. Scan again to see a comparison.'}
        </p>
      ) : (
        <div className="comparison-layout">
          {target && target.before !== null && target.after !== null && (
            <section
              ref={targetRef}
              className={cn('comparison-highlight rise p-5 md:p-7', TONE[tone(target.diff)].panel)}
              style={{ '--i': 1 } as React.CSSProperties}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold tracking-[0.06em] uppercase">Target concern</p>
                <span className={cn('rounded-full bg-white/70 px-3 py-1 text-[13px] font-extrabold', diffColor(target.diff))}>{formatSigned(target.diff ?? 0)} pts</span>
              </div>
              <h2 className="display mt-1.5 text-[30px] leading-none">{target.label}</h2>
              <p className="mt-4 flex items-end gap-3 tabular-nums">
                <CountUp value={Math.round(target.before)} start={targetInView} className="text-[64px] leading-[0.85] font-extrabold tracking-[-0.05em] opacity-45" />
                <ArrowRight size={24} weight="bold" className="mb-2 opacity-50" aria-hidden />
                <CountUp value={Math.round(target.after)} start={targetInView} className="text-[64px] leading-[0.85] font-extrabold tracking-[-0.05em]" />
              </p>
              <div className="mt-5">
                <Dumbbell before={target.before} after={target.after} color={TONE[tone(target.diff)].line} thick />
              </div>
              <div className="mt-1 flex justify-between text-xs font-bold opacity-70">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </section>
          )}

          <Reveal as="section" className="comparison-table tile px-5 py-2 md:px-7">
            <table className="w-full">
              <caption className="sr-only">Average score before and after starting, per concern</caption>
              <thead className="sr-only">
                <tr>
                  <th>Concern</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {others.map((row) => (
                  <tr key={row.key} className="border-t border-hair first:border-t-0">
                    <td colSpan={4} className="py-3.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-bold">{row.label}</span>
                        <span className="flex items-baseline gap-3 tabular-nums">
                          <span className="text-lg font-semibold text-ink-3">{row.before === null ? 'n/a' : Math.round(row.before)}</span>
                          <span className="text-lg font-extrabold">{row.after === null ? 'n/a' : Math.round(row.after)}</span>
                          <span className={cn('w-12 text-right text-sm font-extrabold', diffColor(row.diff))}>{row.diff === null ? 'n/a' : formatSigned(row.diff)}</span>
                        </span>
                      </div>
                      {row.before !== null && row.after !== null && (
                        <div className="mt-2">
                          <Dumbbell before={row.before} after={row.after} color="var(--color-ink)" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      )}
      <p className="mt-4 px-2 text-sm text-ink-2">
        Before: {before.length} scan{before.length === 1 ? '' : 's'}. After: the latest {after.length}. Small changes can be measurement noise. The
        verdict on the product page accounts for that; this table does not.
      </p>
    </main>
  )
}
