import { Confetti, X } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { markMilestonesSeen, readSeenMilestones } from '@/lib/seen-milestones'
import { celebrationText, newMilestones, type Milestone } from '@shared/rhythm/milestones'

const BURST = ['#e8876b', '#4f9a72', '#c99634', '#6f8bb0', '#e8876b', '#4f9a72', '#c99634', '#6f8bb0']

// A friendly card when a milestone is newly reached: shown once (the browser remembers), dismissible.
export function MilestoneCelebration({ milestones, currentStreak, now }: { milestones: readonly Milestone[]; currentStreak: number; now: number }) {
  // Decided once, when the card first appears (Home renders it only after the data has arrived), so dismissing or
  // re-rendering never re-triggers it.
  const [shown] = useState(() => newMilestones(milestones, readSeenMilestones(), now, currentStreak))
  useEffect(() => {
    markMilestonesSeen(shown.map((milestone) => milestone.id))
  }, [shown])

  const [dismissed, setDismissed] = useState(false)
  if (dismissed || shown.length === 0) return null
  const { title, text } = celebrationText(shown[0])

  return (
    <section role="status" className="relative mt-4 flex animate-[pop_.5s_var(--ease-pop)_both] items-start gap-3.5 overflow-hidden rounded-3xl bg-working-bg py-4 pr-12 pl-4 text-[#234f37]">
      <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-white/70" aria-hidden>
        {BURST.map((color, i) => (
          <i
            key={i}
            className="absolute size-1.5 animate-[burst_0.9s_var(--ease-out-soft)_0.2s_both] rounded-full"
            style={{ background: color, '--a': `${i * 45}deg` } as React.CSSProperties}
          />
        ))}
        <Confetti size={24} weight="fill" />
      </span>
      <div>
        <h2 className="text-[17px] leading-snug font-semibold">{title}</h2>
        <p className="mt-1 text-[14.5px] leading-snug">{text}</p>
        {shown.length > 1 && <p className="mt-1.5 text-[12.5px] font-semibold opacity-80">And {shown.length - 1} more in Your rhythm below.</p>}
      </div>
      <button type="button" aria-label="Dismiss" onClick={() => setDismissed(true)} className="absolute top-2.5 right-2.5 grid size-9 cursor-pointer place-items-center rounded-full hover:bg-white/50">
        <X size={18} weight="bold" />
      </button>
    </section>
  )
}
