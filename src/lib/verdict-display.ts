import type { Verdict } from '@shared/verdict/verdict-types'

export const VERDICT_LABELS: Record<Verdict, string> = {
  TOO_EARLY: 'Too early',
  CANT_TELL: "Can't tell yet",
  POSSIBLE_IRRITATION: 'Possible irritation',
  WORKING: 'Working',
  NO_VISIBLE_CHANGE: 'No visible change',
}

// Semantic colours only (they carry meaning). Light text on a dark tint, readable on navy and over photos.
export const VERDICT_CLASSES: Record<Verdict, string> = {
  TOO_EARLY: 'bg-[#1b2246]/90 text-[#d4d7e6] border-white/15',
  CANT_TELL: 'bg-[#3a2f12]/90 text-[#f3d98a] border-[#f3d98a]/25',
  POSSIBLE_IRRITATION: 'bg-[#3d1717]/90 text-[#f7a8a0] border-[#f7a8a0]/25',
  WORKING: 'bg-[#0f3326]/90 text-[#8fe0b6] border-[#8fe0b6]/25',
  NO_VISIBLE_CHANGE: 'bg-[#13294a]/90 text-[#a9cdf5] border-[#a9cdf5]/25',
}
