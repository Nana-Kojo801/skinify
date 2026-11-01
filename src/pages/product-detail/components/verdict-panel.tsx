import { formatPoints, formatSigned } from '@/lib/format'
import { VERDICT_LABELS } from '@/lib/verdict-display'
import { CONCERNS, isConcernKey } from '@shared/concerns'
import { describeEvidence } from '@shared/verdict/evidence'
import { VERDICT_CONFIG } from '@shared/verdict/verdict-config'
import type { Verdict, VerdictInputs } from '@shared/verdict/verdict-types'

const TITLES: Record<Verdict, string> = {
  WORKING: 'It’s improving.', NO_VISIBLE_CHANGE: 'No clear change.', CANT_TELL: 'Not clear yet.',
  POSSIBLE_IRRITATION: 'Possible irritation.', TOO_EARLY: 'Give it more time.',
}

type Props = { verdict: Verdict; reasons: readonly string[]; inputs: VerdictInputs; targetConcern: string; day: number }
export function VerdictPanel({ verdict, reasons, inputs, targetConcern, day }: Props) {
  const concern = isConcernKey(targetConcern) ? CONCERNS[targetConcern].label : targetConcern
  const early = verdict === 'TOO_EARLY'
  const evidence = describeEvidence(verdict, inputs, day)
  const amount = verdict === 'POSSIBLE_IRRITATION' && inputs.worsening ? -inputs.worsening.amount : inputs.improvement
  const worseningConcern = inputs.worsening && isConcernKey(inputs.worsening.concern) ? CONCERNS[inputs.worsening.concern].label : concern
  const noise = verdict === 'POSSIBLE_IRRITATION' && inputs.worsening ? inputs.worsening.threshold : inputs.noiseThreshold
  const before = inputs.baselineMean
  const after = inputs.recentPostMean
  const captions: Record<Verdict, string> = {
    WORKING: 'The improvement is larger than your usual scan variation.',
    NO_VISIBLE_CHANGE: 'The change is within your usual scan variation. There is no measurable improvement yet.',
    CANT_TELL: 'There isn’t enough reliable evidence to separate change from measurement noise.',
    POSSIBLE_IRRITATION: `${inputs.worsening && isConcernKey(inputs.worsening.concern) ? CONCERNS[inputs.worsening.concern].label : concern} worsened by more than your usual scan variation.`,
    TOO_EARLY: `A verdict needs ${VERDICT_CONFIG.minDaysSinceStart} days and at least ${VERDICT_CONFIG.minPostScans} scans after you start.`,
  }
  return <section className={`verdict-panel ${verdict === 'POSSIBLE_IRRITATION' ? 'verdict-warning' : ''}`} aria-label={VERDICT_LABELS[verdict]}>
    <div className="verdict-top"><div><p className="verdict-eyebrow">The verdict</p><h2>{TITLES[verdict]}</h2></div>{!early && amount != null && <p className="verdict-number"><strong>{formatSigned(amount)}</strong><span>{verdict === 'POSSIBLE_IRRITATION' ? `${worseningConcern} points` : 'points'}</span></p>}</div>
    {early ? <div className="verdict-progress">{[['Days since starting', Math.max(0, day), VERDICT_CONFIG.minDaysSinceStart], ['Scans after starting', inputs.postCount, VERDICT_CONFIG.minPostScans]].map(([label, value, total]) => <div key={label}><div><span>{label}</span><b>{value} / {total}</b></div><progress value={Number(value)} max={Number(total)} aria-label={String(label)} /></div>)}</div> : before != null && after != null && <div><p className="scale-concern">{concern} · baseline to recent</p><div className="comparison-scale"><div className="scale-line" aria-hidden><span style={{ left: `${Math.max(0, Math.min(100, before))}%` }}><b>{Math.round(before)}</b><i /></span><span className="current-marker" style={{ left: `${Math.max(0, Math.min(100, after))}%` }}><b>{Math.round(after)}</b><i /></span></div><div className="scale-ticks" aria-hidden>{[0,25,50,75,100].map(n => <span key={n}>{n}</span>)}</div><div className="scale-legend"><span><i />Before <b>{Math.round(before)}</b></span><span><i />Now <b>{Math.round(after)}</b></span></div></div></div>}
    <p className="verdict-caption">{captions[verdict]}</p>
    {!early && <p className="verdict-noise">Normal variation <strong>±{formatPoints(noise)} points</strong></p>}
    {verdict === 'CANT_TELL' && reasons.length > 0 && <p className="verdict-reasons">{reasons.map(r => r === 'FEW_BASELINE_SCANS' ? `${inputs.baselineCount} baseline scans` : r === 'NOISY_SCANS' ? 'Photos disagree' : r === 'POOR_QUALITY' ? 'Latest scan has a quality warning' : r.replaceAll('_', ' ').toLowerCase()).join(' · ')}</p>}
    {evidence && <details className="verdict-evidence"><summary>Evidence <span>{evidence.label}</span></summary><ul>{evidence.facts.map(f => <li key={f}>{f}</li>)}</ul><p>{evidence.next}</p><small>{evidence.note}</small></details>}
  </section>
}
