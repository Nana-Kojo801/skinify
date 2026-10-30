import { Sparkle, X } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Burst } from '@/components/burst'
import { markMilestonesSeen, readSeenMilestones } from '@/lib/seen-milestones'
import { celebrationText, newMilestones, type Milestone } from '@shared/rhythm/milestones'

// A celebration card when a milestone is newly reached: shown once (the browser remembers), dismissible.
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
    <section role="status" className="tile-accent pop-in relative flex items-start gap-4 p-4 pr-14 md:p-5 md:pr-16">
      <Burst className="size-14" coreClassName="bg-ink bg-none text-accent" radius={40}>
        <Sparkle size={26} weight="fill" />
      </Burst>
      <div className="min-w-0">
        <h2 className="text-[20px] leading-tight font-extrabold tracking-[-0.02em]">{title}</h2>
        <p className="mt-1.5 text-[14.5px] leading-snug">{text}</p>
        {shown.length > 1 && <p className="mt-1.5 text-[12.5px] font-bold opacity-80">And {shown.length - 1} more in Your rhythm below.</p>}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="press absolute top-3 right-3 grid size-11 cursor-pointer place-items-center rounded-full bg-white/55 hover:bg-white/80"
      >
        <X size={18} weight="bold" />
      </button>
    </section>
  )
}
