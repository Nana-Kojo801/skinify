import { Check } from '@phosphor-icons/react'
import { formatShortDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Milestone } from '@shared/rhythm/milestones'
import { RHYTHM_CONFIG } from '@shared/rhythm/rhythm-config'
import type { Streak } from '@shared/rhythm/streak'

// "Your rhythm": a weekly scan streak that pauses gently instead of "breaking". Compact pale-blue tile near the top of Home.
export function RhythmCard({ streak, className }: { streak: Streak; className?: string }) {
  if (streak.lastScanAt === null) return null
  return <section className={cn('rhythm-strip', className)} aria-label="Scan consistency">
    <div><strong>{streak.alive ? `${streak.weeks} ${streak.weeks === 1 ? 'week' : 'weeks'} consistent` : 'Your streak is paused'}</strong><span>{streak.recent.filter(Boolean).length} / {streak.recent.length} weeks</span></div>
    <ol aria-label={`Scans in the last ${RHYTHM_CONFIG.weeksShown} weeks`}>{streak.recent.map((scanned, i) => <li key={i} className={scanned ? 'is-complete' : ''} aria-label={scanned ? 'Scanned' : 'No scan'} />)}</ol>
    {!streak.alive && <p>A new scan starts a new streak.</p>}
  </section>
}

// The milestones that come from your own data, and how the streak is counted.
export function MilestonesCard({ milestones }: { milestones: readonly Milestone[] }) {
  return (
    <section className="tile p-5 md:p-6" aria-label="Milestones">
      <ul>
        {milestones.map((milestone) => (
          <li key={milestone.id} className={cn('flex items-center gap-3 border-t border-hair py-3 text-sm first:border-t-0 first:pt-0', !milestone.achieved && 'text-ink-2')}>
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold',
                milestone.achieved ? 'bg-ink text-accent' : 'bg-well',
              )}
            >
              {milestone.achieved ? <Check size={15} weight="bold" /> : milestone.id.replace(/\D/g, '') || '·'}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn('block', milestone.achieved && 'font-semibold text-ink')}>{milestone.title}</span>
              {milestone.detail && <span className="block truncate text-xs text-ink-2">{milestone.detail}</span>}
            </span>
            <span className="shrink-0 text-xs font-semibold text-ink-2">
              {milestone.achievedAt !== null ? formatShortDate(milestone.achievedAt) : (milestone.progress ?? '')}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-ink-2">
        The streak counts the last {RHYTHM_CONFIG.weeksShown} weeks. A week counts when you scan within {RHYTHM_CONFIG.maxGapDays} days of your last scan.
        Missing one just pauses it.
      </p>
    </section>
  )
}
