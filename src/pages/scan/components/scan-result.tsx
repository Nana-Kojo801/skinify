import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { CONCERN_KEYS, CONCERNS } from '@shared/concerns'
import { describeAgreement, type AgreementLevel } from '@shared/scan/photo-agreement'
import { SCAN_CONFIG } from '@shared/scan/scan-config'

export type ScanResultData = {
  scores: Record<string, number>
  qualityFlag: boolean
  /** Average gap between the two photos, in points. */
  gap: number
}

const AGREEMENT_CHIP: Record<AgreementLevel, string> = {
  great: 'bg-working-bg text-working-ink',
  good: 'bg-working-bg text-working-ink',
  uneven: 'bg-canttell-bg text-canttell-ink',
  poor: 'bg-irritation-bg text-irritation-ink',
}

/**
 * Where this scan's photo gap sits on the same bands describeAgreement uses (fractions of the poor-quality threshold),
 * so the chip's word and the scale always agree. The labels come from describeAgreement itself.
 */
function GapScale({ gap }: { gap: number }) {
  const poor = SCAN_CONFIG.poorQualityMeanDiff
  const max = poor * 1.2
  const bands = [
    { from: 0, to: poor * 0.25, color: 'bg-working' },
    { from: poor * 0.25, to: poor * 0.5, color: 'bg-[#a2a4aa]' },
    { from: poor * 0.5, to: poor, color: 'bg-[#77797e]' },
    { from: poor, to: max, color: 'bg-irritation' },
  ]
  const columns = bands.map((band) => `${band.to - band.from}fr`).join(' ')
  const left = (Math.min(gap, max) / max) * 100
  return (
    <div className="relative mt-4 pt-7" aria-hidden>
      <span className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${left}%` }}>
        <b className="pop-in rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-fog tabular-nums">{gap.toFixed(1)}</b>
        <i className="mt-0.5 h-[22px] w-[3px] rounded-full bg-ink" />
      </span>
      <div className="grid h-3 gap-[3px]" style={{ gridTemplateColumns: columns }}>
        {bands.map((band) => (
          <i key={band.from} className={cn('rounded-[4px]', band.color)} />
        ))}
      </div>
      <div className="mt-1.5 grid gap-[3px] text-xs leading-tight font-semibold text-ink-3" style={{ gridTemplateColumns: columns }}>
        {bands.map((band) => (
          <span key={band.from}>{describeAgreement((band.from + band.to) / 2, poor).label}</span>
        ))}
      </div>
    </div>
  )
}

export function ScanResult({ result, ideas }: { result: ScanResultData; ideas?: React.ReactNode }) {
  const agreement = describeAgreement(result.gap)
  return <div className="scan-result-content">
    <header className="screen-heading"><div><h1>Scan recorded</h1><p>Your photos weren’t stored.</p></div><Link to="/" className={`${buttonVariants()} desktop-only`}>Back to overview</Link></header>
    <div className="result-layout"><section className="result-ledger" aria-label="Your scores"><ol>{CONCERN_KEYS.filter(key => result.scores[key] !== undefined).map((key, index) => <li key={key}><span>{String(index+1).padStart(2,'0')}</span><h2>{CONCERNS[key].label}</h2><span className="score-track" aria-hidden><i style={{ width: `${Math.max(0, Math.min(100, result.scores[key]))}%` }} /></span><strong>{Math.round(result.scores[key])}</strong></li>)}</ol><p>Scores out of 100. Higher is healthier.</p></section>
      <div className="result-consistency"><section className="agreement-panel"><header><h2>Photo consistency</h2><strong className={AGREEMENT_CHIP[agreement.level]}>{agreement.label}</strong></header><GapScale gap={result.gap} /><p>{result.gap.toFixed(1)} points between photos.</p><p>{agreement.sentence}</p>{result.qualityFlag && <p className="quality-note">Lower-quality scan: keep light and distance consistent next time.</p>}</section><p className="result-privacy">Saved to your scan history. You can find updated product verdicts in your routine.</p><Link to="/routine" className={buttonVariants({ variant: 'outline' })}>View your routine</Link></div>
    </div>
    <Link to="/" className={`${buttonVariants({ size: 'lg' })} result-mobile-back`}>Back to overview</Link>
    <Collapsible className="secondary-section"><CollapsibleTrigger>Ideas to test<span>Based on this scan</span></CollapsibleTrigger><CollapsibleContent>{ideas}</CollapsibleContent></Collapsible>
  </div>
}
