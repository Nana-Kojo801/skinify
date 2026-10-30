import { Check, Flame } from '@phosphor-icons/react'
import { formatShortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Milestone } from '@shared/rhythm/milestones'
import { RHYTHM_CONFIG } from '@shared/rhythm/rhythm-config'
import type { Streak } from '@shared/rhythm/streak'

// "Your rhythm": a weekly scan streak that pauses gently instead of "breaking". Compact pale-blue tile near the top of Home.
export function RhythmCard({ streak, className }: { streak: Streak; className?: string }) {
  if (streak.lastScanAt === null) return null
  return (
    <section className={cn('tile-accent flex flex-wrap items-end justify-between gap-x-5 gap-y-3 p-4 md:px-5', className)} aria-labelledby="rhythm-title">
      <div>
        <h2 id="rhythm-title" className="eyebrow">
          <Flame size={16} weight="bold" />
          Rhythm
        </h2>
        {streak.alive ? (
          <p className="mt-2 flex items-end gap-2.5">
            <span className="text-[68px] leading-[0.8] font-extrabold tracking-[-0.045em] tabular-nums">{streak.weeks}</span>
            <span className="mb-0.5 text-[14px] leading-tight font-bold">
              {streak.weeks === 1 ? 'week' : 'weeks'}
              <br />
              in a row
            </span>
          </p>
        ) : (
          <>
            <p className="mt-2 text-[34px] leading-none font-extrabold tracking-[-0.03em]">Paused</p>
            <p className="mt-1.5 text-[13.5px] leading-snug font-semibold">
              {streak.lastStreakWeeks > 1 ? `Your last streak was ${streak.lastStreakWeeks} weeks. ` : ''}Scan today to start a new one.
            </p>
          </>
        )}
      </div>
      <ol className="flex gap-1 md:gap-1.5" aria-label={`Scans in each of the last ${RHYTHM_CONFIG.weeksShown} weeks`}>
        {streak.recent.map((scanned, index) => (
          <li
            key={index}
            aria-label={scanned ? 'Scanned' : 'No scan'}
            className={cn(
              'pop-in size-[22px] shrink-0 rounded-[7px] md:size-6',
              scanned ? 'bg-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.3)]' : 'bg-ink/12',
              index === streak.recent.length - 1 && 'outline-2 outline-offset-2 outline-ink/40 outline-dashed',
            )}
            style={{ '--i': index + 3 } as React.CSSProperties}
          />
        ))}
      </ol>
    </section>
  )
}

// The milestones that come from your own data, and how the streak is counted.
export function MilestonesCard({ milestones }: { milestones: readonly Milestone[] }) {
  return (
    <section className="tile p-5 md:p-6" aria-label="Milestones">
      <ul>
        {milestones.map((milestone) => (
          <li key={milestone.id} className={cn('flex items-center gap-3 border-t border-hair py-3 text-[14.5px] first:border-t-0 first:pt-0', !milestone.achieved && 'text-ink-2')}>
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-extrabold',
                milestone.achieved ? 'bg-ink text-accent' : 'bg-well',
              )}
            >
              {milestone.achieved ? <Check size={15} weight="bold" /> : milestone.id.replace(/\D/g, '') || '·'}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block', milestone.achieved && 'font-bold text-ink')}>{milestone.title}</span>
              {milestone.detail && <span className="block truncate text-[12.5px] text-ink-2">{milestone.detail}</span>}
            </span>
            <span className="shrink-0 text-[12.5px] font-semibold text-ink-2">
              {milestone.achievedAt !== null ? formatShortDate(milestone.achievedAt) : (milestone.progress ?? '')}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
        The streak counts the last {RHYTHM_CONFIG.weeksShown} weeks. A week counts when you scan within {RHYTHM_CONFIG.maxGapDays} days of your last scan.
        Missing one just pauses it.
      </p>
    </section>
  )
}
