import type { Verdict } from '@shared/verdict/verdict-types'
import { VERDICT_LABELS, VERDICT_STYLE } from '@/lib/verdict-display'
import { cn } from '@/lib/utils'

export function VerdictPill({ verdict, className }: { verdict: Verdict | null; className?: string }) {
  if (!verdict) {
    return <span className={cn('inline-flex h-7 items-center rounded-full bg-well px-3 text-xs font-semibold text-ink-2', className)}>No verdict yet</span>
  }
  const style = VERDICT_STYLE[verdict]
  return (
    <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full pr-3 pl-2.5 text-xs font-semibold whitespace-nowrap', style.pill, className)}>
      <i className={cn('size-2 rounded-full', style.dot)} />
      {VERDICT_LABELS[verdict]}
    </span>
  )
}
