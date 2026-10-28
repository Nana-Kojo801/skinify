import type { Verdict } from '@shared/verdict/verdict-types'

export const VERDICT_LABELS: Record<Verdict, string> = {
  TOO_EARLY: 'Too early',
  CANT_TELL: "Can't tell yet",
  POSSIBLE_IRRITATION: 'Possible irritation',
  WORKING: 'Working',
  NO_VISIBLE_CHANGE: 'No visible change',
}

// Semantic colours only (they carry meaning), all dark text on a light tint for AA contrast.
export const VERDICT_CLASSES: Record<Verdict, string> = {
  TOO_EARLY: 'bg-slate-100 text-slate-700',
  CANT_TELL: 'bg-amber-100 text-amber-900',
  POSSIBLE_IRRITATION: 'bg-red-100 text-red-900',
  WORKING: 'bg-emerald-100 text-emerald-900',
  NO_VISIBLE_CHANGE: 'bg-sky-100 text-sky-900',
}
