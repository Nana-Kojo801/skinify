import { RadarChart } from '@/components/radar-chart'
import { formatShortDate } from '@/lib/format'
import { buildOverview, OVERVIEW_CONFIG, signed, type OverviewScan } from '@shared/overview/overview'

// "Your skin overview": a radar of the 8 concerns, first scan vs latest, a short list of what moved, and YouCam's own
// overall score when the scans have one. Honest about what a radar can and can't say.
export function SkinOverview({ scans }: { scans: readonly OverviewScan[] | undefined }) {
  if (!scans || scans.length === 0) return null
  const overview = buildOverview(scans)

  if (!overview) {
    return (
      <section className="card p-5 md:p-6">
        <h2 className="text-xl font-semibold tracking-[-0.02em]">Your skin overview</h2>
        <p className="mt-1.5 text-[15px] text-muted">
          Once you have two scans without a quality warning, this shows how each concern moved between your first scan and your latest.
        </p>
      </section>
    )
  }

  return (
    <section className="card p-5 md:p-6" aria-labelledby="overview-title">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id="overview-title" className="text-xl font-semibold tracking-[-0.02em]">
            Your skin overview
          </h2>
          <p className="mt-1 text-[14px] text-muted">
            First scan vs your latest, {formatShortDate(overview.firstAt)} to {formatShortDate(overview.latestAt)}.
          </p>
        </div>
        {overview.overall && (
          <div className="tile shrink-0 px-3.5 py-2.5 text-center">
            <p className="text-[32px] leading-none font-light tracking-[-0.04em] tabular-nums">{overview.overall.now}</p>
            <p className="mt-1 text-[11.5px] leading-tight text-muted">Overall, YouCam's estimate</p>
            {overview.overall.delta !== null && overview.overall.delta !== 0 && (
              <p className={`mt-0.5 text-[12.5px] font-bold ${overview.overall.delta > 0 ? 'text-working-ink' : 'text-cocoa-soft'}`}>
                {signed(overview.overall.delta)} since first scan
              </p>
            )}
          </div>
        )}
      </div>

      <RadarChart axes={overview.rows.map((row) => ({ label: row.label, before: row.before, now: row.now }))} className="mx-auto mt-3 w-full max-w-[380px]" />
      <p className="mt-1 flex justify-center gap-5 text-[13px] font-semibold" aria-hidden>
        <span>
          <i className="mr-1.5 inline-block size-3 rounded bg-[#cdbdb1] align-[-1px]" />
          Before
        </span>
        <span>
          <i className="mr-1.5 inline-block size-3 rounded bg-coral align-[-1px]" />
          Now
        </span>
      </p>

      <ul className="mt-3.5 text-[14.5px]">
        {overview.moved.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-3 border-t border-nude py-2">
            <span className="font-medium">{row.label}</span>
            <span className={`font-bold tabular-nums ${row.delta > 0 ? 'text-working-ink' : 'text-cocoa-soft'}`}>
              {Math.round(row.before)} → {Math.round(row.now)} ({signed(row.delta)})
            </span>
          </li>
        ))}
        {overview.stillCount > 0 && (
          <li className="flex items-center justify-between gap-3 border-t border-nude py-2 text-muted">
            <span>{overview.moved.length === 0 ? 'Every concern' : 'Every other concern'}</span>
            <span className="font-bold">under {OVERVIEW_CONFIG.movedAtLeast} {OVERVIEW_CONFIG.movedAtLeast === 1 ? 'point' : 'points'}</span>
          </li>
        )}
      </ul>

      <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
        Each spoke is one concern, scored 1 to 100 (higher is healthier). Scores for different concerns are not on one common scale, so compare each spoke with
        its own "before", not one concern with another. Scores are estimates from photos, not a medical assessment.
      </p>
    </section>
  )
}
