import type { Verdict } from '@shared/verdict/verdict-types'
import { VERDICT_CLASSES, VERDICT_LABELS } from '@/lib/verdict-display'

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2.5 py-1 text-xs font-medium whitespace-nowrap backdrop-blur ${VERDICT_CLASSES[verdict]}`}
    >
      {VERDICT_LABELS[verdict]}
    </span>
  )
}
