import { useInView } from '@/lib/motion'
import { formatShortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { buildOverview, OVERVIEW_CONFIG, signed, type OverviewScan } from '@shared/overview/overview'

// "Your skin overview": every concern as a bar (your latest scan) with a marker where it stood at your first scan,
// and YouCam's own overall score when the scans have one. Honest about what it can and can't say.
export function SkinOverview({ scans }: { scans: readonly OverviewScan[] | undefined }) {
  const [ref, inView] = useInView<HTMLDivElement>()
  if (!scans || scans.length === 0) return null
  const overview = buildOverview(scans)

  if (!overview) {
    return (
      <section className="skin-overview tile p-5 md:p-6">
        <h3 className="text-[19px] font-extrabold tracking-[-0.02em]">Not enough scans yet</h3>
        <p className="mt-1.5 text-[14.5px] leading-snug text-ink-2">
          Once you have two scans without a quality warning, this shows how each concern moved between your first scan and your latest.
        </p>
      </section>
    )
  }

  return (
    <section className="skin-overview tile p-5 md:p-6" aria-labelledby="overview-title">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 id="overview-title" className="eyebrow">
            First scan and now
          </h3>
          <p className="mt-1.5 text-[13.5px] text-ink-2">
            {formatShortDate(overview.firstAt)} to {formatShortDate(overview.latestAt)}. Out of 100, higher is healthier.
          </p>
        </div>
        {overview.overall && (
          <div className="shrink-0 text-right">
            <p className="text-[44px] leading-[0.85] font-extrabold tracking-[-0.04em] tabular-nums">{overview.overall.now}</p>
            <p className="mt-1 text-[11.5px] leading-tight font-semibold text-ink-2">Overall, YouCam's estimate</p>
            {overview.overall.delta !== null && overview.overall.delta !== 0 && (
              <p className={cn('text-[12.5px] font-bold', overview.overall.delta > 0 ? 'text-working-ink' : 'text-ink-2')}>{signed(overview.overall.delta)} since first scan</p>
            )}
          </div>
        )}
      </div>

      <div ref={ref} data-shown={inView} className="mt-5 grid gap-x-9 gap-y-3.5 md:grid-cols-2">
        {overview.rows.map((row, index) => {
          const moved = Math.abs(row.delta) >= OVERVIEW_CONFIG.movedAtLeast
          return (
            <div key={row.key} className="overview-row">
              <span className="truncate">{row.label}</span>
              <span className="relative h-3 rounded-full bg-ink/7 shadow-[inset_0_1px_2px_rgb(14_23_38/0.08)]">
                <span
                  className="grow-x absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-primary-hi to-primary"
                  style={{ width: `${Math.max(2, Math.min(100, row.now))}%`, '--i': index } as React.CSSProperties}
                />
                <span
                  className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink shadow-[0_1px_3px_rgb(0_0_0/0.25)]"
                  style={{ left: `${Math.max(0, Math.min(100, row.before))}%` }}
                  title={`First scan: ${Math.round(row.before)}`}
                />
              </span>
              <span className="w-[74px] text-right tabular-nums">
                <b className="font-extrabold">{Math.round(row.now)}</b>
                <span className={cn('ml-1.5 text-[12.5px] font-bold', !moved ? 'text-ink-3' : row.delta > 0 ? 'text-working-ink' : 'text-ink-2')}>
                  {moved ? signed(row.delta) : '·'}
                </span>
              </span>
            </div>
          )
        })}
      </div>

      <p className="mt-4 flex items-center gap-4 text-[12.5px] font-bold text-ink-2" aria-hidden>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-3 rounded-full border-2 border-white bg-ink shadow-[0_1px_3px_rgb(0_0_0/0.25)]" />
          First scan
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-2.5 w-5 rounded-full bg-linear-to-r from-primary-hi to-primary" />
          Latest scan
        </span>
      </p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
        {overview.stillCount > 0
          ? `${overview.moved.length === 0 ? 'Every concern' : 'Every other concern'} moved under ${OVERVIEW_CONFIG.movedAtLeast} ${OVERVIEW_CONFIG.movedAtLeast === 1 ? 'point' : 'points'}. `
          : ''}
        Scores for different concerns are not on one common scale, so compare each bar with its own first scan, not one concern with another. Scores are
        estimates from photos, not a medical assessment.
      </p>
    </section>
  )
}
