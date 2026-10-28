import type { Verdict } from '@shared/verdict/verdict-types'
import { VERDICT_LABELS, VERDICT_STYLE } from '@/lib/verdict-display'
import { cn } from '@/lib/utils'

export function VerdictPill({ verdict, className }: { verdict: Verdict | null; className?: string }) {
  if (!verdict) {
    return <span className={cn('inline-flex h-7 items-center rounded-full bg-sand px-3 text-[13px] font-semibold text-muted', className)}>No verdict yet</span>
  }
  const style = VERDICT_STYLE[verdict]
  return (
    <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap', style.pill, className)}>
      <i className={cn('size-[7px] rounded-full', style.dot)} />
      {VERDICT_LABELS[verdict]}
    </span>
  )
}
