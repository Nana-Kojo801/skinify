import type { Verdict } from '@shared/verdict/verdict-types'

export const VERDICT_LABELS: Record<Verdict, string> = {
  TOO_EARLY: 'Too early',
  CANT_TELL: "Can't tell yet",
  POSSIBLE_IRRITATION: 'Possible irritation',
  WORKING: 'Working',
  NO_VISIBLE_CHANGE: 'No visible change',
}

/** One headline per verdict for the product page. `concern` is the lowercase concern label. */
export function verdictHeadline(verdict: Verdict, concern: string): string {
  switch (verdict) {
    case 'WORKING':
      return `Your ${concern} is improving`
    case 'NO_VISIBLE_CHANGE':
      return 'No visible change yet'
    case 'CANT_TELL':
      return "We can't tell yet"
    case 'POSSIBLE_IRRITATION':
      return 'Possible irritation'
    case 'TOO_EARLY':
      return 'Too early to judge'
  }
}

// Semantic colours only (they carry meaning). Pastel background, deep text, a saturated dot/line colour.
// The values are the --color-<verdict>* tokens in index.css; SVG strokes use `line`.
export const VERDICT_STYLE: Record<Verdict, { pill: string; panel: string; text: string; dot: string; line: string }> = {
  WORKING: { pill: 'bg-working-bg text-working-ink', panel: 'bg-working-bg', text: 'text-working-ink', dot: 'bg-working', line: 'var(--color-working)' },
  NO_VISIBLE_CHANGE: { pill: 'bg-nochange-bg text-nochange-ink', panel: 'bg-nochange-bg', text: 'text-nochange-ink', dot: 'bg-nochange', line: 'var(--color-nochange)' },
  CANT_TELL: { pill: 'bg-canttell-bg text-canttell-ink', panel: 'bg-canttell-bg', text: 'text-canttell-ink', dot: 'bg-canttell', line: 'var(--color-canttell)' },
  POSSIBLE_IRRITATION: { pill: 'bg-irritation-bg text-irritation-ink', panel: 'bg-irritation-bg', text: 'text-irritation-ink', dot: 'bg-irritation', line: 'var(--color-irritation)' },
  TOO_EARLY: { pill: 'bg-early-bg text-early-ink', panel: 'bg-early-bg', text: 'text-early-ink', dot: 'bg-early', line: 'var(--color-early)' },
}
