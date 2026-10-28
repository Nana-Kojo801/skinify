import { Check, Info } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { ScoreRing } from '@/components/score-ring'
import { buttonVariants } from '@/components/ui/button'
import { CONCERN_KEYS, CONCERNS } from '@shared/concerns'

export type ScanResultData = {
  scores: Record<string, number>
  qualityFlag: boolean
}

const BURST = ['#e8876b', '#4f9a72', '#c99634', '#6f8bb0', '#e8876b', '#4f9a72', '#c99634', '#6f8bb0', '#e8876b', '#4f9a72']

// The reward after a scan: a tick that draws itself inside a small burst, then the scores ring in one by one.
export function ScanResult({ result }: { result: ScanResultData }) {
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
        <span className="relative grid size-16 animate-[pop_.6s_var(--ease-pop)_.1s_both] place-items-center rounded-full bg-working-ink text-white">
          <Check size={32} weight="bold" />
        </span>
      </div>
      <h1 className="rise mt-5 text-[36px] leading-tight font-semibold tracking-[-0.035em] md:text-5xl" style={{ '--i': 2 } as React.CSSProperties}>
        Scan saved
      </h1>
      <p className="rise mt-1.5 max-w-sm text-muted" style={{ '--i': 3 } as React.CSSProperties}>
        Scores run 1 to 100, higher is healthier. Your photos were not saved.
      </p>
      {result.qualityFlag && (
        <p className="rise mt-4 flex items-start gap-2.5 rounded-2xl bg-canttell-bg px-4 py-3 text-left text-sm text-canttell-ink" style={{ '--i': 4 } as React.CSSProperties}>
          <Info size={18} className="mt-px shrink-0" />
          The two photos disagreed quite a bit, so this scan is marked as lower quality. Next time use the same window light and distance for both.
        </p>
      )}
      <section className="card rise mt-6 w-full px-2.5 pt-6 pb-5 md:px-6" style={{ '--i': 4 } as React.CSSProperties}>
        <ul className="grid grid-cols-4 gap-y-5">
          {CONCERN_KEYS.filter((key) => result.scores[key] !== undefined).map((key, index) => (
            <li key={key}>
              <ScoreRing value={result.scores[key]} label={CONCERNS[key].label} index={index + 4} />
            </li>
          ))}
        </ul>
      </section>
      <Link to="/" className={buttonVariants({ size: 'lg', className: 'rise mt-6 w-full md:w-auto md:px-10' })} style={{ '--i': 6 } as React.CSSProperties}>
        Back to products
      </Link>
    </div>
  )
}
