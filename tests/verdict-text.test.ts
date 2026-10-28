import { describe, expect, it } from 'vitest'
import { checkExplanation } from '../shared/explanation/explanation-check'
import { buildExplanationInput, buildExplanationMessages } from '../shared/explanation/explanation-prompt'
import { computeVerdict } from '../shared/verdict/compute-verdict'
import { verdictSignature } from '../shared/verdict/verdict-signature'
import { fallbackSummary, nextStepFor } from '../shared/verdict/verdict-templates'
import type { ScanInput, Verdict, VerdictResult } from '../shared/verdict/verdict-types'

const DAY = 86_400_000
const T0 = Date.UTC(2026, 8, 1)
const START = T0 + 14 * DAY
const DAYS = [0, 7, 21, 28, 35, 42, 49]

function series(acne: number[], redness = [60, 60, 60, 60, 60, 60, 60], diff = 1, poor = false): ScanInput[] {
  return acne.map((a, i) => ({
    createdAt: T0 + DAYS[i] * DAY,
    scores: { acne: a, redness: redness[i] },
    noise: { acne: diff, redness: diff },
    qualityFlag: poor && i === acne.length - 1,
  }))
}
const verdictFor = (scans: ScanInput[], now = START + 40 * DAY) =>
  computeVerdict({ scans, startDate: START, targetConcern: 'acne', now })

const CASES: Record<Verdict, VerdictResult> = {
  WORKING: verdictFor(series([50, 52, 55, 60, 66, 70, 72])),
  NO_VISIBLE_CHANGE: verdictFor(series([50, 52, 51, 50, 52, 51, 53])),
  TOO_EARLY: verdictFor(series([50, 52, 55, 60, 66]), START + 20 * DAY),
  CANT_TELL: verdictFor(series([50, 52, 55, 60, 66, 70, 72], undefined, 20, true).slice(1)),
  POSSIBLE_IRRITATION: verdictFor(series([50, 52, 55, 60, 66, 70, 72], [70, 70, 66, 60, 55, 50, 45])),
}

describe('templated summaries (the fallback text)', () => {
  it('the five cases really produce the five verdicts', () => {
    for (const [verdict, result] of Object.entries(CASES)) expect(result.verdict).toBe(verdict)
  })

  for (const [verdict, result] of Object.entries(CASES)) {
    it(`${verdict}: passes the same checks we apply to LLM text`, () => {
      const text = fallbackSummary(result)
      expect(checkExplanation(text, result, nextStepFor(result))).toEqual({ ok: true, text })
      expect(text).toContain('Next step:')
    })
  }

  it('CANT_TELL names every reason and gives the rescan advice as the next step', () => {
    const r = CASES.CANT_TELL
    const text = fallbackSummary(r)
    expect(r.reasons).toEqual(['FEW_BASELINE_SCANS', 'NOISY_SCANS', 'POOR_QUALITY'])
    expect(text).toContain('from before you started')
    expect(text).toContain('too much to spot a real change')
    expect(text).toContain('flagged as poor quality')
    expect(nextStepFor(r)).toBe(r.rescanAdvice[0])
  })

  it('TOO_EARLY says how much longer to keep going', () => {
    // 3 scans are already there, so only time is missing
    expect(nextStepFor(CASES.TOO_EARLY)).toBe('keep using it and scan again in about 8 days')
    // with scans missing too it asks for both
    const fewScans = { ...CASES.TOO_EARLY, inputs: { ...CASES.TOO_EARLY.inputs, postScansRemaining: 2 } }
    expect(nextStepFor(fewScans)).toBe('keep using it and scan about once a week: roughly 8 more days and 2 more scans to go')
  })

  it('never diagnoses', () => {
    for (const result of Object.values(CASES)) expect(fallbackSummary(result)).not.toMatch(/diagnos|rosacea|eczema/i)
  })
})

describe('checkExplanation', () => {
  const row = CASES.WORKING
  const good =
    'Your acne score is about 20 points better than before you started, rising from 51 to 71. ' +
    'That gap is well above the roughly 2.8 points of normal variation between scans. ' +
    'This suggests the product may be helping, though other factors matter too. ' +
    'Next step: keep using it as directed and keep scanning weekly to confirm the change holds.'

  it('accepts a good explanation', () => expect(checkExplanation(good, row).ok).toBe(true))

  it('strips think-blocks and markdown', () => {
    const result = checkExplanation(`<think>hmm 999</think>\n**${good}**`, row)
    expect(result).toEqual({ ok: true, text: good })
  })

  it('rejects a number that is not in the verdict', () => {
    expect(checkExplanation(good.replace('51 to 71', '51 to 87'), row)).toEqual({ ok: false, reason: 'unexpected number 87' })
  })

  it('allows small counts like "3 more weeks"', () => {
    expect(checkExplanation(good.replace('keep using it', 'keep using it for 3 more weeks and'), row).ok).toBe(true)
  })

  it('rejects diagnoses and conditions', () => {
    expect(checkExplanation(good.replace('may be helping', 'clears your eczema'), row)).toEqual({ ok: false, reason: 'banned wording' })
    expect(checkExplanation(good.replace('may be helping', 'was diagnosed as fine'), row).ok).toBe(false)
  })

  it('needs exactly one next step', () => {
    expect(checkExplanation(good.replace('Next step:', 'Then'), row)).toEqual({ ok: false, reason: 'needs exactly one next step' })
    expect(checkExplanation(`${good} Next step: also do this.`, row).ok).toBe(false)
  })

  it('rejects text that is too short, too long or has too few sentences', () => {
    expect(checkExplanation('Looks fine. Next step: wait.', row).ok).toBe(false)
    expect(checkExplanation(good.repeat(3), row)).toEqual({ ok: false, reason: 'too long' })
    expect(checkExplanation('Your acne score improved a lot since you started using this product, which is good. Next step: keep going with it.', row)).toEqual({ ok: false, reason: 'wrong number of sentences' })
  })
})

describe('what the LLM is allowed to see', () => {
  it('only numbers, enums and the concern label, nothing about the user or photos', () => {
    const input = buildExplanationInput({ ...CASES.WORKING })
    expect(Object.keys(input).sort()).toEqual([
      'changeInScore', 'concern', 'daysSinceStart', 'improvement', 'normalVariation', 'problems', 'recentScore',
      'scansAfterStart', 'scansBeforeStart', 'scoreBeforeStart', 'suggestedNextStep', 'verdict', 'worsening',
    ])
    const messages = buildExplanationMessages(CASES.WORKING)
    expect(messages.map((m) => m.role)).toEqual(['system', 'user'])
    expect(messages[0].content).toMatch(/never diagnose/i)
  })
})

describe('verdictSignature', () => {
  const base = CASES.WORKING
  it('ignores the day counters (they change every day)', () => {
    const later = { ...base, inputs: { ...base.inputs, daysSinceStart: base.inputs.daysSinceStart + 5, daysRemaining: 0 } }
    expect(verdictSignature(later)).toBe(verdictSignature(base))
  })
  it('changes when the data or the verdict changes', () => {
    expect(verdictSignature({ ...base, inputs: { ...base.inputs, change: 19 } })).not.toBe(verdictSignature(base))
    expect(verdictSignature({ ...base, verdict: 'NO_VISIBLE_CHANGE' })).not.toBe(verdictSignature(base))
  })
  it('is independent of key order', () => {
    const reordered = { verdict: base.verdict, inputs: Object.fromEntries(Object.entries(base.inputs).reverse()) as typeof base.inputs }
    expect(verdictSignature(reordered)).toBe(verdictSignature(base))
  })
  it('refreshes TOO_EARLY text weekly, not daily', () => {
    const early = (daysRemaining: number) => ({ ...CASES.TOO_EARLY, inputs: { ...CASES.TOO_EARLY.inputs, daysRemaining } })
    expect(verdictSignature(early(7))).toBe(verdictSignature(early(6))) // same week left: same row
    expect(verdictSignature(early(8))).not.toBe(verdictSignature(early(7))) // a week less: new row
  })
})
