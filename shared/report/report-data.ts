// The printable report for a pharmacist or dermatologist (issue #41, feature 9). Pure: turns the person's stored
// products, scans and verdicts into plain rows. Only numbers and fixed wording come out of here: no photos (none
// exist), no model-written text, no personal identifiers.
import { CONCERN_KEYS, CONCERNS, type ConcernKey } from '../concerns'
import { DAY_MS } from '../reminders/reminder-config'
import { describeEvidence } from '../verdict/evidence'
import { VERDICT_CONFIG } from '../verdict/verdict-config'
import type { CantTellReason, Verdict, VerdictInputs } from '../verdict/verdict-types'

export const REPORT_VERDICT_LABELS: Record<Verdict, string> = {
  WORKING: 'WORKING',
  NO_VISIBLE_CHANGE: 'NO VISIBLE CHANGE',
  CANT_TELL: "CAN'T TELL YET",
  POSSIBLE_IRRITATION: 'POSSIBLE IRRITATION',
  TOO_EARLY: 'TOO EARLY',
}

export const REPORT_DISCLAIMER =
  "This is a record of numbers from the person's own weekly selfies, not a medical assessment or a diagnosis. Scores are estimates from photos made by YouCam's skin analysis and can move with light, angle and expression. No photos are stored or included. Receipts is not a medical device. The decision about any product or treatment belongs with a qualified professional."

export type ReportScan = { createdAt: number; scores: Record<string, number>; qualityFlag: boolean }
export type ReportProduct = { _id: string; name: string; targetConcern: string; startDate: number; endDate?: number | null }
export type ReportVerdict = { verdict: Verdict; reasons: readonly string[]; inputs: VerdictInputs }

export type ReportProductRow = {
  name: string
  concern: string
  startDate: number
  /** Whole days since the start (0 before it). */
  day: number
  /** false once the person has marked the product as ended. */
  active: boolean
  endDate: number | null
  verdictLabel: string
  /** Plain facts behind the result, one per line. */
  lines: string[]
  /** "59 → 72 (+13.1)" or null when there is no comparison yet. */
  scoreChange: string | null
  /** "±2.9" or null. */
  variation: string | null
}

export type ReportScanRow = { createdAt: number; scores: (number | null)[]; flagged: boolean; startedProducts: number }

export type Report = {
  generatedAt: number
  scanCount: number
  firstScanAt: number | null
  lastScanAt: number | null
  concernLabels: string[]
  products: ReportProductRow[]
  scans: ReportScanRow[]
  howToRead: string[]
}

const round1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1)
const signed1 = (n: number) => `${n >= 0 ? '+' : '-'}${round1(Math.abs(n))}`
const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`

function reasonLine(reason: CantTellReason, inputs: VerdictInputs): string {
  switch (reason) {
    case 'FEW_BASELINE_SCANS':
      return `Only ${inputs.baselineCount} of the ${VERDICT_CONFIG.minBaselineScans} scans needed before the start date.`
    case 'NOISY_SCANS':
      return `Photos of the same scan disagreed by about ${round1(inputs.noise)} points, too much to spot a real change.`
    case 'POOR_QUALITY':
      return 'A recent scan was marked as lower quality.'
  }
}

function productRow(product: ReportProduct, verdict: ReportVerdict | undefined, now: number): ReportProductRow {
  const concern = isKnown(product.targetConcern) ? CONCERNS[product.targetConcern].label : product.targetConcern
  const day = Math.max(0, Math.floor((now - product.startDate) / DAY_MS))
  const endDate = product.endDate ?? null
  const base = { name: product.name, concern, startDate: product.startDate, day, active: endDate === null || endDate > now, endDate }
  if (!verdict) return { ...base, verdictLabel: 'NO RESULT YET', lines: ['No verdict has been computed yet.'], scoreChange: null, variation: null }

  const { inputs } = verdict
  const lines: string[] = []
  if (verdict.verdict === 'TOO_EARLY') {
    lines.push(
      `${plural(inputs.postCount, 'scan')} of the ${VERDICT_CONFIG.minPostScans} needed since the start, ${plural(day, 'day')} of ${VERDICT_CONFIG.minDaysSinceStart}.`,
    )
  } else if (verdict.verdict === 'CANT_TELL') {
    for (const reason of verdict.reasons) lines.push(reasonLine(reason as CantTellReason, inputs))
    if (lines.length === 0) lines.push('The measurements were too variable to spot a real change.')
  } else {
    const evidence = describeEvidence(verdict.verdict, inputs, day)
    if (evidence) lines.push(...evidence.facts.map((fact) => `${fact}.`))
  }

  const hasComparison = verdict.verdict !== 'TOO_EARLY' && inputs.baselineMean !== null && inputs.recentPostMean !== null && inputs.change !== null
  return {
    ...base,
    verdictLabel: REPORT_VERDICT_LABELS[verdict.verdict],
    lines,
    scoreChange: hasComparison ? `${Math.round(inputs.baselineMean!)} → ${Math.round(inputs.recentPostMean!)} (${signed1(inputs.change!)})` : null,
    variation: verdict.verdict === 'TOO_EARLY' ? null : `±${round1(inputs.noiseThreshold)}`,
  }
}

function isKnown(key: string): key is ConcernKey {
  return Object.hasOwn(CONCERNS, key)
}

export function buildReport(input: {
  products: readonly ReportProduct[]
  scans: readonly ReportScan[]
  /** The newest verdict per product id. */
  verdicts: ReadonlyMap<string, ReportVerdict>
  now: number
}): Report {
  const scans = [...input.scans].sort((a, b) => a.createdAt - b.createdAt)
  const products = [...input.products].sort((a, b) => a.startDate - b.startDate || a.name.localeCompare(b.name))
  return {
    generatedAt: input.now,
    scanCount: scans.length,
    firstScanAt: scans[0]?.createdAt ?? null,
    lastScanAt: scans[scans.length - 1]?.createdAt ?? null,
    concernLabels: CONCERN_KEYS.map((key) => CONCERNS[key].label),
    products: products.map((product) => productRow(product, input.verdicts.get(product._id), input.now)),
    scans: scans.map((scan) => ({
      createdAt: scan.createdAt,
      scores: CONCERN_KEYS.map((key) => (Number.isFinite(scan.scores[key]) ? Math.round(scan.scores[key]) : null)),
      flagged: scan.qualityFlag,
      startedProducts: products.filter((product) => scan.createdAt >= product.startDate && scan.createdAt < product.startDate + DAY_MS).length,
    })),
    howToRead: [
      'Each verdict compares scans after the start date with scans before it.',
      `It needs at least ${VERDICT_CONFIG.minDaysSinceStart} days and ${VERDICT_CONFIG.minPostScans} scans after the start, and ${VERDICT_CONFIG.minBaselineScans} scans before it.`,
      `"Normal variation" is how much two photos taken back to back disagree. A change counts only if it is more than ${VERDICT_CONFIG.noiseMultiplier} times that.`,
      'Redness getting clearly worse after a start is flagged as possible irritation.',
      'Two products on one concern started close together cannot be told apart.',
      'Scores for different concerns are not on one common scale: compare each with its own earlier scores.',
      'Scans marked lower quality are shown but are not used for verdicts.',
    ],
  }
}
