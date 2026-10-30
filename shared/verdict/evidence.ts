import { CONCERNS, isConcernKey } from '../concerns'
import { EVIDENCE_CONFIG } from './verdict-config'
import type { Verdict, VerdictInputs } from './verdict-types'

export type EvidenceLevel = 'thin' | 'fair' | 'solid'

export interface Evidence {
  level: EvidenceLevel
  label: 'Thin' | 'Fair' | 'Solid'
  /** 1 to 3 filled bars. */
  bars: 1 | 2 | 3
  /** Plain facts behind the label. */
  facts: string[]
  /** One line on what happens next. Never promises that more scans will confirm anything. */
  next: string
  /** Says what the label is about, so "Solid" is not read as "the product works". */
  note: string
}

const LEVELS: Record<EvidenceLevel, Pick<Evidence, 'label' | 'bars'>> = {
  thin: { label: 'Thin', bars: 1 },
  fair: { label: 'Fair', bars: 2 },
  solid: { label: 'Solid', bars: 3 },
}

const NEXT: Record<EvidenceLevel, string> = {
  thin: 'Keep scanning weekly. More scans give a firmer picture, and the verdict only changes if the numbers do.',
  fair: 'Weekly scans keep adding to this. The verdict updates by itself and only changes if the numbers do.',
  solid: 'The numbers are clear and based on several scans. Keep scanning weekly: the verdict updates if they change.',
}

const CANT_TELL_NEXT = 'Fix what is listed above, then keep scanning weekly. The verdict updates by itself.'
const NOTE = 'This rates the measurement, not the product.'

const round1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1)
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/**
 * How solid a verdict's measurement is, from numbers already stored with it. Display only: the verdict engine is
 * not involved, and the answer never says a product works. `day` is the live day count (inputs.daysSinceStart is as of
 * when the verdict was computed). Returns null for TOO_EARLY (the verdict card already shows its progress).
 */
export function describeEvidence(verdict: Verdict, inputs: VerdictInputs, day: number = inputs.daysSinceStart): Evidence | null {
  if (verdict === 'TOO_EARLY') return null

  const scansAndDays = `${plural(inputs.postCount, 'scan')} since you started, ${plural(day, 'day')} tracked`
  if (verdict === 'CANT_TELL') {
    return { ...LEVELS.thin, level: 'thin', facts: [scansAndDays], next: CANT_TELL_NEXT, note: NOTE }
  }

  const threshold = inputs.noiseThreshold
  let marginFact: string
  let clearMargin: boolean
  if (verdict === 'WORKING') {
    const margin = threshold > 0 && inputs.improvement !== null ? inputs.improvement / threshold : 0
    clearMargin = margin >= EVIDENCE_CONFIG.clearMargin
    marginFact = `Your change is ${round1(margin)} times normal variation${margin < EVIDENCE_CONFIG.justPastLineBelow ? ', only just past the line' : ''}`
  } else if (verdict === 'POSSIBLE_IRRITATION') {
    const worsening = inputs.worsening
    const margin = worsening && worsening.threshold > 0 ? worsening.amount / worsening.threshold : 0
    clearMargin = margin >= EVIDENCE_CONFIG.clearMargin
    const concern = worsening && isConcernKey(worsening.concern) ? CONCERNS[worsening.concern].label.toLowerCase() : 'score'
    marginFact = `Your ${concern} got worse by ${round1(margin)} times normal variation`
  } else {
    const margin = threshold > 0 && inputs.improvement !== null ? Math.abs(inputs.improvement) / threshold : Number.POSITIVE_INFINITY
    clearMargin = margin <= EVIDENCE_CONFIG.flatMargin
    marginFact = `Your change is inside normal variation (±${round1(threshold)})`
  }

  const deepData = inputs.postCount >= EVIDENCE_CONFIG.deepPostScans && day >= EVIDENCE_CONFIG.deepDays
  const level: EvidenceLevel = clearMargin && deepData ? 'solid' : clearMargin || deepData ? 'fair' : 'thin'
  return { ...LEVELS[level], level, facts: [scansAndDays, marginFact], next: NEXT[level], note: NOTE }
}
