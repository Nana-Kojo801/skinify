import { CountUp } from '@/components/count-up'
import { CONCERN_KEYS, CONCERNS, type ConcernKey } from '@shared/concerns'
import { describeAgreement, meanGap } from '@shared/scan/photo-agreement'
import { cn } from '@/lib/utils'

type LatestScan = { createdAt: number; scores: Record<string, number>; noise: Record<string, number>; qualityFlag: boolean; overall?: number } | null | undefined

/** Three scores pinned to a face zone on the photo (display only; every score is also listed below them). */
const PINS: { key: ConcernKey; className: string; dot: string }[] = [
  { key: 'radiance', className: 'left-[52%] top-[16%]', dot: 'bg-accent' },
  { key: 'acne', className: 'left-[6%] top-[40%]', dot: 'bg-working-bg' },
  { key: 'moisture', className: 'right-[5%] top-[50%]', dot: 'bg-accent-2' },
]

// The newest scan: a skin-texture photo (never the user's own photo: those are not stored) with a drawn face map,
// three scores pinned to face zones, YouCam's overall estimate when the scan has one, and all eight scores on glass.
export function LatestScanCard({ scan }: { scan: Exclude<LatestScan, null> }) {
  if (scan === undefined) return <div className="skeleton h-[440px] md:h-full md:min-h-[400px]" aria-hidden />

  const agreement = describeAgreement(meanGap(scan.noise))
  const keys = CONCERN_KEYS.filter((key) => scan.scores[key] !== undefined)
  const date = new Date(scan.createdAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  const hasOverall = typeof scan.overall === 'number' && Number.isFinite(scan.overall)

  return (
    <section className="photo-tile flex h-[460px] flex-col md:h-full md:min-h-[360px]" aria-label={`Latest scan, ${date}`}>
      <img src="/images/skin-texture.webp" alt="" className="settle absolute inset-0 size-full object-cover object-[50%_55%]" />
      <span aria-hidden className="absolute inset-0 bg-linear-to-b from-black/30 via-black/0 via-30% to-black/75" />

      <div className="relative z-10 flex items-start justify-between gap-2 p-3.5">
        <span className="glass-clear inline-flex h-8 items-center rounded-full px-3.5 text-xs font-semibold">Latest scan · {date}</span>
        <span className="glass-dark inline-flex h-8 items-center rounded-full px-3.5 text-xs font-semibold">
          {scan.qualityFlag ? 'Lower quality' : agreement.label}
        </span>
      </div>

      <svg viewBox="0 0 210 270" className="facemap absolute top-[9%] left-1/2 z-[1] h-[52%] -translate-x-1/2 text-white/75" aria-hidden>
        <ellipse cx="105" cy="128" rx="78" ry="104" />
        <path d="M60 104q18-10 34 0M116 104q18-10 34 0M98 150q7 8 14 0M78 190q27 16 54 0" />
        <circle cx="62" cy="160" r="4" />
        <circle cx="105" cy="58" r="4" />
        <circle cx="150" cy="150" r="4" />
      </svg>
      {PINS.filter((pin) => scan.scores[pin.key] !== undefined).map((pin, index) => (
        <span
          key={pin.key}
          className={cn('glass pop-in absolute z-10 inline-flex h-8 items-center gap-1.5 rounded-full pr-3 pl-1.5 text-xs font-semibold text-ink', pin.className)}
          style={{ '--i': index + 5 } as React.CSSProperties}
          aria-hidden
        >
          <i className={cn('size-5 rounded-full', pin.dot)} />
          {CONCERNS[pin.key].label}
          <b className="tabular-nums">{Math.round(scan.scores[pin.key])}</b>
        </span>
      ))}

      <div className="relative z-10 mt-auto flex flex-col gap-3 p-3.5">
        {hasOverall && (
          <div className="px-1.5">
            <p className="text-9xl leading-[0.8] font-bold tracking-tighter tabular-nums md:text-9xl">
              <CountUp value={Math.round(scan.overall as number)} />
            </p>
            <p className="mt-2 text-xs font-semibold tracking-eyebrow uppercase opacity-90">Overall, YouCam's estimate</p>
          </div>
        )}
        <ul className="glass-dark grid grid-cols-4 gap-x-1 gap-y-2.5 rounded-[22px] px-2 py-3" aria-label="Scores from your latest scan, 1 to 100, higher is healthier">
          {keys.map((key) => (
            <li key={key} className="flex flex-col items-center text-center">
              <span className="text-2xl leading-none font-bold tracking-tighter tabular-nums">
                <CountUp value={Math.round(scan.scores[key])} />
              </span>
              <span className="mt-1 text-xs leading-tight font-semibold text-white/75">{CONCERNS[key].label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
