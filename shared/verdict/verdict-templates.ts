// Plain-language text for each verdict, built only from the verdict's numbers.
// Used as the stored summary right away and as the fallback when the LLM explanation is unavailable,
// too slow, or fails its sanity checks. No diagnoses, no invented numbers.
import { CONCERNS, isConcernKey } from '../concerns'
import type { Verdict, VerdictInputs, CantTellReason } from './verdict-types'

/** The parts of a verdict row the text needs (the stored row has them all). */
export interface VerdictText {
  verdict: Verdict
  inputs: VerdictInputs
  reasons: readonly string[]
  rescanAdvice: readonly string[]
}

/** 12.5 -> "12.5", 3 -> "3", 3.04 -> "3". */
export const fmt = (n: number): string => String(Number(n.toFixed(1)))

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function concernLabel(concern: string): string {
  return isConcernKey(concern) ? CONCERNS[concern].label.toLowerCase() : concern
}

/** Short lowercase next steps for CANT_TELL (the full sentences in `rescanAdvice` are shown separately). */
const RESCAN_STEP: Record<CantTellReason, string> = {
  FEW_BASELINE_SCANS: 'if you have not started it yet, move the start date forward and scan twice before the first use',
  NOISY_SCANS: 'rescan in the same spot each time: face a window, even light, no filters, same distance and angle',
  POOR_QUALITY: 'rescan in even daylight with your face centred and filling the frame, no filters or heavy makeup',
}

/** The single next step we recommend for a verdict (also given to the LLM so it only has to rephrase it). */
export function nextStepFor({ verdict, inputs, reasons }: VerdictText): string {
  switch (verdict) {
    case 'TOO_EARLY': {
      const days = inputs.daysRemaining
      const scans = inputs.postScansRemaining
      if (days > 0 && scans > 0) {
        return `keep using it and scan about once a week: roughly ${plural(days, 'more day')} and ${plural(scans, 'more scan')} to go`
      }
      if (scans > 0) return `keep scanning about once a week: ${plural(scans, 'more scan')} needed`
      return `keep using it and scan again in about ${plural(days, 'day')}`
    }
    case 'CANT_TELL': {
      const reason = reasons.find((r): r is CantTellReason => r in RESCAN_STEP)
      return reason ? RESCAN_STEP[reason] : 'rescan in even daylight, no filters, same distance each time'
    }
    case 'POSSIBLE_IRRITATION':
      return 'consider pausing it and doing a patch test; if your skin stays red or sore, ask a pharmacist or dermatologist'
    case 'WORKING':
      return 'keep using it as directed and keep scanning weekly to confirm the change holds'
    case 'NO_VISIBLE_CHANGE':
      return 'give it a few more weeks, or ask a pharmacist or dermatologist whether it suits your goal'
  }
}

const REASON_TEXT: Record<CantTellReason, (i: VerdictInputs) => string> = {
  FEW_BASELINE_SCANS: (i) =>
    `You have ${plural(i.baselineCount, 'scan')} from before you started this product and we need at least 2.`,
  NOISY_SCANS: (i) =>
    `Your two photos per scan differ by about ${fmt(i.noise)} points, which is too much to spot a real change.`,
  POOR_QUALITY: () => 'Your latest scan was flagged as poor quality.',
}

/** 3 to 4 sentences plus one "Next step:" sentence, from the numbers only. */
export function fallbackSummary(row: VerdictText): string {
  const { verdict, inputs: i } = row
  const label = concernLabel(i.targetConcern)
  const next = `Next step: ${nextStepFor(row)}.`
  const caveat = 'These are estimates from photos, not a medical assessment.'

  switch (verdict) {
    case 'TOO_EARLY':
      return [
        'It is too early to judge this product.',
        'Skin changes usually take about 4 weeks to show up, and we need at least 3 scans after you start.',
        `You are ${plural(i.daysSinceStart, 'day')} in with ${plural(i.postCount, 'scan')} since starting.`,
        next,
      ].join(' ')
    case 'CANT_TELL': {
      const reasons = row.reasons
        .filter((r): r is CantTellReason => r in REASON_TEXT)
        .map((r) => REASON_TEXT[r](i))
      return ['We cannot tell yet whether this product is working.', ...reasons, next].join(' ')
    }
    case 'POSSIBLE_IRRITATION': {
      const w = i.worsening
      const what = w ? `Your ${concernLabel(w.concern)} score dropped by about ${fmt(w.amount)} points compared with before you started` : `Your ${label} score looks worse than before you started`
      return [
        `${what}, beyond the ${fmt(w?.threshold ?? i.noiseThreshold)} points we treat as normal variation between scans.`,
        'That can be a sign of irritation, although photos alone cannot tell the cause.',
        caveat,
        next,
      ].join(' ')
    }
    case 'WORKING':
      return [
        `Your ${label} score is about ${fmt(i.improvement ?? 0)} points better than before you started (${fmt(i.baselineMean ?? 0)} to ${fmt(i.recentPostMean ?? 0)}).`,
        `That is more than the ${fmt(i.noiseThreshold)} points we treat as normal variation between scans.`,
        'So far this product may be helping, although other things can affect skin too.',
        next,
      ].join(' ')
    case 'NO_VISIBLE_CHANGE':
      return [
        `Your ${label} score has not moved beyond normal variation: ${fmt(i.baselineMean ?? 0)} before and ${fmt(i.recentPostMean ?? 0)} now.`,
        `After ${plural(i.daysSinceStart, 'day')} and ${plural(i.postCount, 'scan')}, the change is within the ${fmt(i.noiseThreshold)} points we treat as normal variation.`,
        'That does not rule out benefits a photo cannot show.',
        next,
      ].join(' ')
  }
}
