import type { Verdict } from '@shared/verdict/verdict-types'
import { VERDICT_CLASSES, VERDICT_LABELS } from '@/lib/verdict-display'

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${VERDICT_CLASSES[verdict]}`}>
      {VERDICT_LABELS[verdict]}
    </span>
  )
}
