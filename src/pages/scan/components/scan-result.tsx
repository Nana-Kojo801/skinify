import { Check } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { ScoreRing } from '@/components/score-ring'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CONCERN_KEYS, CONCERNS } from '@shared/concerns'
import { describeAgreement, type AgreementLevel } from '@shared/scan/photo-agreement'

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

const BURST = ['#e8876b', '#4f9a72', '#c99634', '#6f8bb0', '#e8876b', '#4f9a72', '#c99634', '#6f8bb0', '#e8876b', '#4f9a72']

// The reward after a scan: a tick that draws itself inside a small burst, then the scores ring in one by one.
export function ScanResult({ result }: { result: ScanResultData }) {
  const agreement = describeAgreement(result.gap)
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mt-6 grid size-24 place-items-center" aria-hidden>
        {BURST.map((color, i) => (
          <span
            key={i}
            className="absolute size-2 animate-[burst_0.9s_var(--ease-out-soft)_0.35s_both] rounded-full"
            style={{ background: color, '--a': `${i * 36}deg` } as React.CSSProperties}
          />
        ))}
        <span className="absolute inset-0 animate-[pop_.6s_var(--ease-pop)_both] rounded-full bg-working-bg" />
        <span className="relative grid size-16 animate-[pop_.6s_var(--ease-pop)_.1s_both] place-items-center rounded-full bg-working-ink text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_12px_24px_-10px_rgb(47_107_74/0.8)]">
          <Check size={32} weight="bold" />
        </span>
      </div>
      <h1 className="rise mt-5 text-[36px] leading-tight font-semibold tracking-[-0.035em] md:text-5xl" style={{ '--i': 2 } as React.CSSProperties}>
        Scan saved
      </h1>
      <p className="rise mt-1.5 max-w-sm text-muted" style={{ '--i': 3 } as React.CSSProperties}>
        Scores run 1 to 100, higher is healthier. Your photos were not saved.
      </p>
      <section className="card rise mt-6 w-full px-2.5 pt-6 pb-5 md:px-6" style={{ '--i': 4 } as React.CSSProperties}>
        <ul className="grid grid-cols-4 gap-y-5">
          {CONCERN_KEYS.filter((key) => result.scores[key] !== undefined).map((key, index) => (
            <li key={key}>
              <ScoreRing value={result.scores[key]} label={CONCERNS[key].label} index={index + 4} />
            </li>
          ))}
        </ul>
      </section>
      <section className="tile rise mt-4 w-full p-5 text-left" style={{ '--i': 5 } as React.CSSProperties}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold">How steady was this scan?</h2>
          <span className={cn('rounded-full px-3 py-1 text-[13px] font-semibold whitespace-nowrap', AGREEMENT_CHIP[agreement.level])}>{agreement.label}</span>
        </div>
        <p className="mt-2 text-[14px] leading-snug text-muted">{agreement.sentence}</p>
        <p className="mt-2 text-[13px] text-muted">
          Average gap between your two photos: <strong className="font-semibold text-cocoa">{result.gap.toFixed(1)} points</strong> (smaller is better). That gap is how
          we tell a real change from normal noise.
        </p>
      </section>
      <Link to="/" className={buttonVariants({ size: 'lg', className: 'rise mt-6 w-full md:w-auto md:px-10' })} style={{ '--i': 6 } as React.CSSProperties}>
        Back to products
      </Link>
    </div>
  )
}
