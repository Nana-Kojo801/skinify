import type { Verdict } from '@shared/verdict/verdict-types'

export const VERDICT_LABELS: Record<Verdict, string> = {
  TOO_EARLY: 'Too early',
  CANT_TELL: "Can't tell yet",
  POSSIBLE_IRRITATION: 'Possible irritation',
  WORKING: 'Working',
  NO_VISIBLE_CHANGE: 'No visible change',
}

export const VERDICT_CLASSES: Record<Verdict, string> = {
  TOO_EARLY: 'bg-neutral-100 text-neutral-700',
  CANT_TELL: 'bg-amber-100 text-amber-800',
  POSSIBLE_IRRITATION: 'bg-red-100 text-red-800',
  WORKING: 'bg-green-100 text-green-800',
  NO_VISIBLE_CHANGE: 'bg-blue-100 text-blue-800',
}
