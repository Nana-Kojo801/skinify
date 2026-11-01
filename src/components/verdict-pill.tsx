import type { Verdict } from '@shared/verdict/verdict-types'
import { VERDICT_LABELS, VERDICT_STYLE } from '@/lib/verdict-display'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export function VerdictPill({ verdict, className }: { verdict: Verdict | null; className?: string }) {
  if (!verdict) {
    return <Badge variant="secondary" className={className}>No verdict yet</Badge>
  }
  const style = VERDICT_STYLE[verdict]
  return (
    <Badge className={cn('pl-2.5', style.pill, className)}>
      <i className={cn('size-2 rounded-full', style.dot)} />
      {VERDICT_LABELS[verdict]}
    </Badge>
  )
}
