import { ArrowRight, CaretLeft } from '@phosphor-icons/react'
import { useQuery } from 'convex/react'
import { Link, useParams } from 'react-router'
import { CountUp } from '@/components/count-up'
import { PageSkeleton } from '@/components/page-skeleton'
import { Reveal } from '@/components/reveal'
import { buttonVariants } from '@/components/ui/button'
import { formatDate, formatSigned } from '@/lib/format'
import { useInView } from '@/lib/motion'
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
      <div className={cn('absolute inset-x-0 rounded-full bg-line', thick ? 'top-2 h-1' : 'top-[5px] h-0.5')} />
      <div
        className={cn('absolute rounded-full', thick ? 'top-2 h-1' : 'top-[5px] h-0.5')}
        style={{
          left: `${lo}%`,
          width: `${hi - lo}%`,
          background: color,
          transformOrigin: after >= before ? 'left' : 'right',
          transform: inView ? 'none' : 'scaleX(0)',
          transition: 'transform .9s var(--ease-out-soft) .3s',
        }}
      />
      <div className={cn('absolute -translate-x-1/2 rounded-full bg-[#cdbdb1]', thick ? 'top-[3px] size-3.5' : 'top-0.5 size-2')} style={{ left: `${before}%` }} />
      <div
        className={cn('absolute rounded-full border-2 border-white', thick ? 'top-0.5 size-4' : 'top-px size-2.5')}
        style={{
          left: `${after}%`,
          background: color,
          transform: `translateX(-50%) scale(${inView ? 1 : 0.3})`,
          opacity: inView ? 1 : 0,
          transition: 'transform .5s var(--ease-pop) 1s, opacity .3s ease 1s',
        }}
      />
    </div>
  )
}

const tone = (diff: number | null) => (diff === null || Number(diff.toFixed(1)) === 0 ? 'flat' : diff > 0 ? 'up' : 'down')
const TONE = {
  up: { panel: 'bg-working-bg text-[#234f37]', line: 'var(--color-working-ink)' },
  down: { panel: 'bg-irritation-bg text-irritation-ink', line: 'var(--color-irritation-ink)' },
  flat: { panel: 'bg-sand text-cocoa', line: 'var(--color-cocoa-soft)' },
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
      <main className="mx-auto max-w-md px-5 pt-16 text-center">
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <Link to="/" className={buttonVariants({ variant: 'soft', className: 'mt-5' })}>
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
    diff === null || Number(diff.toFixed(1)) === 0 ? 'text-muted' : diff > 0 ? 'text-working-ink' : 'text-irritation-ink'

  return (
    <main className="mx-auto max-w-3xl px-4 md:px-8 md:pt-8">
      <header className="flex h-16 items-center md:h-auto">
        <Link to={`/products/${productId}`} className="press -ml-1 flex min-h-11 items-center gap-2 font-semibold">
          <span className="grid size-10 place-items-center rounded-full bg-sand">
            <CaretLeft size={18} weight="bold" />
          </span>
          {product.name}
        </Link>
      </header>

      <section className="rise mt-2 px-1 md:mt-6">
        <h1 className="text-[36px] leading-[1.05] font-semibold tracking-[-0.035em] md:text-5xl">Before and after</h1>
        <p className="mt-2 text-muted md:text-[17px]">
          {product.name}, started {formatDate(product.startDate)}. Scores run 1 to 100, higher is healthier.
        </p>
        <div className="mt-3.5 flex flex-wrap gap-2 text-[13px] font-semibold">
          <span className="flex items-center gap-1.5 rounded-full bg-sand px-3 py-1.5">
            <i className="size-2 rounded-full bg-[#cdbdb1]" />
            Before · {before.length} scan{before.length === 1 ? '' : 's'}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-sand px-3 py-1.5">
            <i className="size-2 rounded-full bg-coral" />
            After · latest {after.length}
          </span>
        </div>
      </section>

      {before.length === 0 || after.length === 0 ? (
        <p className="rise mt-6 rounded-(--radius-card) bg-sand p-6" style={{ '--i': 1 } as React.CSSProperties}>
          {before.length === 0
            ? 'No scans from before the start date, so there is nothing to compare against.'
            : 'No scans after the start date yet. Scan again to see a comparison.'}
        </p>
      ) : (
        <>
          {target && target.before !== null && target.after !== null && (
            <section
              ref={targetRef}
              className={cn('rise mt-6 rounded-(--radius-card) px-5 py-5.5 md:px-7', TONE[tone(target.diff)].panel)}
              style={{ '--i': 1 } as React.CSSProperties}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold tracking-[0.06em] uppercase">Target concern</p>
                <span className={cn('rounded-full bg-white px-3 py-1 text-[13px] font-bold', diffColor(target.diff))}>{formatSigned(target.diff ?? 0)} pts</span>
              </div>
              <h2 className="mt-1.5 text-2xl font-semibold">{target.label}</h2>
              <p className="mt-2 flex items-baseline gap-3 tabular-nums">
                <CountUp value={Math.round(target.before)} start={targetInView} className="text-5xl font-light tracking-[-0.04em] opacity-60" />
                <ArrowRight size={22} className="opacity-50" aria-hidden />
                <CountUp value={Math.round(target.after)} start={targetInView} className="text-5xl font-semibold tracking-[-0.04em]" />
              </p>
              <div className="mt-4">
                <Dumbbell before={target.before} after={target.after} color={TONE[tone(target.diff)].line} thick />
              </div>
              <div className="mt-1 flex justify-between text-xs font-semibold opacity-70">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </section>
          )}

          <Reveal as="section" className="card mt-3.5 px-5 py-1.5 md:px-7">
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
                  <tr key={row.key} className="border-t border-line first:border-t-0">
                    <td colSpan={4} className="py-3.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold">{row.label}</span>
                        <span className="flex items-baseline gap-3 tabular-nums">
                          <span className="text-lg text-muted">{row.before === null ? 'n/a' : Math.round(row.before)}</span>
                          <span className="text-lg font-semibold">{row.after === null ? 'n/a' : Math.round(row.after)}</span>
                          <span className={cn('w-12 text-right text-sm font-semibold', diffColor(row.diff))}>{row.diff === null ? 'n/a' : formatSigned(row.diff)}</span>
                        </span>
                      </div>
                      {row.before !== null && row.after !== null && (
                        <div className="mt-2">
                          <Dumbbell before={row.before} after={row.after} color="var(--color-coral)" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </>
      )}
      <p className="mt-4 px-1 text-sm text-muted">
        Before: {before.length} scan{before.length === 1 ? '' : 's'}. After: the latest {after.length}. Small changes can be measurement noise. The
        verdict on the product page accounts for that; this table does not.
      </p>
    </main>
  )
}
