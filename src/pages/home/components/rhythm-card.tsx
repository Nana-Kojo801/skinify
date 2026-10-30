import { Check } from '@phosphor-icons/react'
import { formatShortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Milestone } from '@shared/rhythm/milestones'
import { RHYTHM_CONFIG } from '@shared/rhythm/rhythm-config'
import type { Streak } from '@shared/rhythm/streak'

// "Your rhythm": a weekly scan streak that pauses gently instead of "breaking", and milestones from your own data.
export function RhythmCard({ streak, milestones }: { streak: Streak; milestones: readonly Milestone[] }) {
  if (streak.lastScanAt === null) {
    return (
      <section className="card p-5 md:p-6">
        <h2 className="text-xl font-semibold tracking-[-0.02em]">Your rhythm</h2>
        <p className="mt-1.5 text-[15px] text-muted">Your first scan starts your streak. Weekly scans make every verdict steadier.</p>
      </section>
    )
  }

  const headline = streak.alive ? (
    <>
      <span className="text-[44px] leading-none font-light tracking-[-0.04em] tabular-nums">{streak.weeks}</span>
      <span className="ml-1.5 text-[15px] font-semibold">{streak.weeks === 1 ? 'week' : 'weeks'} in a row</span>
    </>
  ) : (
    <span className="text-[28px] leading-none font-semibold tracking-[-0.03em]">Paused</span>
  )

  return (
    <section className="card p-5 md:p-6" aria-labelledby="rhythm-title">
      <h2 id="rhythm-title" className="text-xl font-semibold tracking-[-0.02em]">
        Your rhythm
      </h2>
      <p className="mt-1 text-[14px] text-muted">Weekly scans make your verdicts steadier.</p>
      <p className="mt-3.5 flex items-baseline">{headline}</p>
      {!streak.alive && (
        <p className="mt-1.5 text-[14.5px] text-cocoa-soft">
          {streak.lastStreakWeeks > 1 ? `Your last streak was ${streak.lastStreakWeeks} weeks. ` : ''}Scan today to start a new one.
        </p>
      )}

      <ol className="mt-3.5 flex gap-1.5" aria-label={`Scans in each of the last ${RHYTHM_CONFIG.weeksShown} weeks`}>
        {streak.recent.map((scanned, index) => (
          <li
            key={index}
            aria-label={scanned ? 'Scanned' : 'No scan'}
            className={cn(
              'grid h-8 flex-1 place-items-center rounded-xl',
              scanned ? 'bg-coral text-white' : 'bg-sand shadow-(--shadow-inset)',
              index === streak.recent.length - 1 && 'outline-2 outline-offset-2 outline-coral/60 outline-dashed',
            )}
          >
            {scanned && <Check size={14} weight="bold" />}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
        The last {RHYTHM_CONFIG.weeksShown} weeks. A week counts when you scan within {RHYTHM_CONFIG.maxGapDays} days of your last scan. Missing one just pauses it.
      </p>

      <ul className="mt-3.5">
        {milestones.map((milestone) => (
          <li key={milestone.id} className={cn('flex items-center gap-3 border-t border-nude py-2.5 text-[14.5px]', !milestone.achieved && 'text-muted')}>
            <span className={cn('grid size-7 shrink-0 place-items-center rounded-full text-[13px] font-bold', milestone.achieved ? 'bg-working-bg text-working-ink' : 'bg-sand')}>
              {milestone.achieved ? <Check size={14} weight="bold" /> : milestone.id.replace(/\D/g, '') || '·'}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block', milestone.achieved && 'font-semibold text-cocoa')}>{milestone.title}</span>
              {milestone.detail && <span className="block truncate text-[12.5px] text-muted">{milestone.detail}</span>}
            </span>
            <span className="shrink-0 text-[12.5px] text-muted">
              {milestone.achievedAt !== null ? formatShortDate(milestone.achievedAt) : (milestone.progress ?? '')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
