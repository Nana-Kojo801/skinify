import { Link } from 'react-router'
import { Check } from '@phosphor-icons/react'
import { buttonVariants } from '@/components/ui/button'
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
    { from: poor * 0.25, to: poor * 0.5, color: 'bg-[#7fd3a2]' },
    { from: poor * 0.5, to: poor, color: 'bg-[#f2c14e]' },
    { from: poor, to: max, color: 'bg-irritation' },
  ]
  const columns = bands.map((band) => `${band.to - band.from}fr`).join(' ')
  const left = (Math.min(gap, max) / max) * 100
  return (
    <div className="relative mt-4 pt-7" aria-hidden>
      <span className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${left}%` }}>
        <b className="pop-in rounded-full bg-ink px-2 py-0.5 text-xs font-extrabold text-white tabular-nums">{gap.toFixed(1)}</b>
        <i className="mt-0.5 h-[22px] w-[3px] rounded-full bg-ink" />
      </span>
      <div className="grid h-3 gap-[3px]" style={{ gridTemplateColumns: columns }}>
        {bands.map((band) => (
          <i key={band.from} className={cn('rounded-[4px]', band.color)} />
        ))}
      </div>
      <div className="mt-1.5 grid gap-[3px] text-[11.5px] leading-tight font-bold text-ink-3" style={{ gridTemplateColumns: columns }}>
        {bands.map((band) => (
          <span key={band.from}>{describeAgreement((band.from + band.to) / 2, poor).label}</span>
        ))}
      </div>
    </div>
  )
}

// A saved journal entry: the score ledger, photo agreement, and ideas for the next step.
export function ScanResult({ result, ideas }: { result: ScanResultData; ideas?: React.ReactNode }) {
  const agreement = describeAgreement(result.gap)
  const back = (className?: string) => (
    <Link to="/" className={buttonVariants({ size: 'lg', className })}>
      Back to products
    </Link>
  )
  return (
    <div className="scan-result-content">
      <header className="flex flex-col items-center gap-4 text-center md:flex-row md:items-center md:justify-between md:text-left">
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6">
          <span className="saved-scan-stamp" aria-hidden><Check size={30} /><span>ON RECORD</span></span>
          <div>
            <p className="kicker mb-3">THE WEEKLY CHECK-IN / COMPLETE</p>
            <h1 className="display rise text-[36px] leading-none md:text-[56px]" style={{ '--i': 2 } as React.CSSProperties}>
              A new page in your journal.
            </h1>
            <p className="rise mt-2 max-w-sm text-ink-2 md:max-w-none md:text-[17px]" style={{ '--i': 3 } as React.CSSProperties}>
              Scores run 1 to 100, higher is healthier. Your photos were not saved.
            </p>
          </div>
        </div>
        {back('hidden md:inline-flex')}
      </header>

      <div className="flex items-baseline justify-between px-1.5 pt-8 pb-3">
        <h2 className="display text-[25px] leading-none md:text-[28px]">Your scores</h2>
        {result.qualityFlag && <span className="text-[13.5px] font-bold text-canttell-ink">Lower quality scan</span>}
      </div>
      <section className="tile rise px-2 pt-6 pb-5 md:px-5 md:pt-7" style={{ '--i': 4 } as React.CSSProperties}>
        <ul className="result-score-ledger">
          {CONCERN_KEYS.filter((key) => result.scores[key] !== undefined).map((key) => (
            <li key={key}>
              <span>{CONCERNS[key].label}</span><strong>{Math.round(result.scores[key])}<small>/100</small></strong><span className="result-score-track" aria-hidden><i style={{ width: `${Math.max(0, Math.min(100, result.scores[key]))}%` }} /></span>
            </li>
          ))}
        </ul>
      </section>

      <h2 className="display px-1.5 pt-9 pb-3 text-[25px] leading-none md:text-[28px]">What to do with them</h2>
      <div className="scan-result-analysis">
        <section className="tile rise p-5 md:p-6" style={{ '--i': 5 } as React.CSSProperties}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[19px] leading-tight font-extrabold tracking-[-0.02em]">How steady was this scan?</h3>
            <span className={cn('rounded-full px-3 py-1 text-[13px] font-extrabold whitespace-nowrap', AGREEMENT_CHIP[agreement.level])}>{agreement.label}</span>
          </div>
          <p className="mt-2 text-[14.5px] leading-snug text-ink-2">{agreement.sentence}</p>
          <div className="md:max-w-[640px]">
            <GapScale gap={result.gap} />
          </div>
          <p className="mt-3 text-[13.5px] leading-snug text-ink-2">
            Average gap between your two photos: <strong className="font-extrabold text-ink">{result.gap.toFixed(1)} points</strong> (smaller is better). That gap is
            how we tell a real change from normal noise.
          </p>
        </section>
        {ideas}
      </div>
      {back('mt-6 w-full md:hidden')}
    </div>
  )
}
