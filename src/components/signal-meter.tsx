import { useInView } from '@/lib/motion'

type SignalMeterProps = {
  /** Measured change in the "better" direction (negative = worse). */
  value: number
  /** Normal variation: changes inside ±threshold are noise. */
  threshold: number
  /** Marker colour (a verdict token, e.g. var(--color-working)). */
  color: string
}

/** 1, 2, 2.5, 5, 10, 20, 25, 50 ... at or above n. */
function niceCeil(n: number): number {
  const exp = 10 ** Math.floor(Math.log10(Math.max(n, 0.1)))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * exp >= n) ?? 10
  return step * exp
}

// "Signal vs noise": a track with the hatched normal-variation band around zero and a marker at the measured change,
// so the verdict is visibly earned. The marker slides in from zero on a spring once it scrolls into view.
export function SignalMeter({ value, threshold, color }: SignalMeterProps) {
  const [ref, inView] = useInView<HTMLDivElement>()
  const half = niceCeil(Math.max(Math.abs(value), threshold) * 1.35)
  const pos = (n: number) => 50 + (Math.max(-half, Math.min(half, n)) / half) * 50
  const dot = pos(value)
  const bandHalf = (threshold / half) * 50
  return (
    <div ref={ref}>
      <div className="relative h-9">
        <div className="absolute inset-x-0 top-[13px] h-2.5 rounded-full bg-white/70 shadow-[inset_0_1px_2px_rgb(35_24_29/0.12)]" />
        <div
          className="absolute top-[7px] h-[22px] rounded-lg bg-[repeating-linear-gradient(135deg,rgb(35_24_29/0.15)_0_4px,rgb(35_24_29/0.04)_4px_8px)]"
          style={{
            left: `${50 - bandHalf}%`,
            width: `${bandHalf * 2}%`,
            opacity: inView ? 1 : 0,
            transform: inView ? 'none' : 'scaleX(0.3)',
            transition: 'opacity .6s var(--ease-liquid) .2s, transform .9s var(--ease-liquid) .2s',
          }}
        />
        <div className="absolute inset-y-[3px] left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-ink/40" />
        <div
          className="absolute top-[18px] size-[22px] rounded-full border-[3.5px] border-white shadow-[0_4px_10px_-3px_rgb(0_0_0/0.45)]"
          style={{
            left: `${dot}%`,
            background: color,
            transform: `translate(calc(-50% + ${inView ? 0 : (50 - dot) * 3}px), -50%) scale(${inView ? 1 : 0.4})`,
            opacity: inView ? 1 : 0,
            transition: 'transform 1.1s var(--ease-spring) .5s, opacity .4s ease .5s',
          }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs font-bold opacity-70">
        <span>Worse</span>
        <span>No change</span>
        <span>Better</span>
      </div>
    </div>
  )
}
