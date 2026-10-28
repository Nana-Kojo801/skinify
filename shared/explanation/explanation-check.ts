// Sanity checks for text from the LLM. Anything that fails is replaced by the templated summary.
import type { VerdictText } from '../verdict/verdict-templates'

const MIN_LENGTH = 80
const MAX_LENGTH = 900

/** Words an explanation must never use: no diagnoses, conditions or treatment advice. */
const BANNED = /\b(diagnos\w*|rosacea|eczema|dermatitis|psoriasis|melanoma|cancer\w*|infect\w*|prescri\w*|antibiotic\w*|steroid\w*|retinoid\w*|tretinoin)\b/i

function numbersIn(value: unknown, out: Set<number>): void {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const abs = Math.abs(value)
    out.add(abs)
    out.add(Math.round(abs))
    out.add(Number(abs.toFixed(1)))
    out.add(Number(abs.toFixed(2)))
  } else if (typeof value === 'string') {
    for (const m of value.match(/\d+(?:\.\d+)?/g) ?? []) out.add(Number(m))
  } else if (Array.isArray(value)) {
    value.forEach((v) => numbersIn(v, out))
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => numbersIn(v, out))
  }
}

export type ExplanationCheck = { ok: true; text: string } | { ok: false; reason: string }

/** Cleans the model's text (think-blocks, markdown) and checks it against the verdict it explains. */
export function checkExplanation(raw: string, row: VerdictText, extraAllowedText = ''): ExplanationCheck {
  const text = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (text.length < MIN_LENGTH) return { ok: false, reason: 'too short' }
  if (text.length > MAX_LENGTH) return { ok: false, reason: 'too long' }
  if (BANNED.test(text)) return { ok: false, reason: 'banned wording' }

  const nextSteps = text.match(/next step/gi)?.length ?? 0
  if (nextSteps !== 1) return { ok: false, reason: 'needs exactly one next step' }

  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0)
  if (sentences.length < 3 || sentences.length > 7) return { ok: false, reason: 'wrong number of sentences' }

  // Every number must come from the verdict's own numbers (or be a small count like "3 more weeks").
  const allowed = new Set<number>()
  numbersIn(row.inputs, allowed)
  numbersIn(row.rescanAdvice, allowed)
  numbersIn(extraAllowedText, allowed)
  for (const m of text.match(/\d+(?:\.\d+)?/g) ?? []) {
    const n = Number(m)
    const smallCount = Number.isInteger(n) && n >= 1 && n <= 12
    if (!allowed.has(n) && !smallCount) return { ok: false, reason: `unexpected number ${m}` }
  }
  return { ok: true, text }
}
