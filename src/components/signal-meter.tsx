import { useInView } from '@/lib/motion'

type SignalMeterProps = {
  /** Measured change in the "better" direction (negative = worse). */
  value: number
  /** Normal variation: changes inside ±threshold are noise. */
  threshold: number
  /** Fill colour (a verdict token, e.g. var(--color-working-ink)). */
  color: string
  /** Shaded band colour. */
  bandColor: string
}

/** 1, 2, 2.5, 5, 10, 20, 25, 50 ... at or above n. */
function niceCeil(n: number): number {
  const exp = 10 ** Math.floor(Math.log10(Math.max(n, 0.1)))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * exp >= n) ?? 10
  return step * exp
}

// "Signal vs noise": a track with the shaded normal-variation band around zero and a dot at the measured change,
// so the verdict is visibly earned. Animates (scale and opacity only) when it scrolls into view.
export function SignalMeter({ value, threshold, color, bandColor }: SignalMeterProps) {
  const [ref, inView] = useInView<HTMLDivElement>()
  const half = niceCeil(Math.max(Math.abs(value), threshold) * 1.35)
  const pos = (n: number) => 50 + (Math.max(-half, Math.min(half, n)) / half) * 50
  const dot = pos(value)
  const bandHalf = (threshold / half) * 50
  return (
    <div ref={ref}>
      <div className="relative h-9">
        <div className="absolute inset-x-0 top-[13px] h-2.5 rounded-full bg-white/75" />
        <div
          className="absolute top-[9px] h-[18px] rounded-md"
          style={{
            left: `${50 - bandHalf}%`,
            width: `${bandHalf * 2}%`,
            background: bandColor,
            opacity: inView ? 1 : 0,
            transform: inView ? 'none' : 'scaleX(0.4)',
            transition: 'opacity .6s var(--ease-out-soft) .2s, transform .8s var(--ease-out-soft) .2s',
          }}
        />
        <div
          className="absolute top-[13px] h-2.5"
          style={{
            left: `${Math.min(50, dot)}%`,
            width: `${Math.abs(dot - 50)}%`,
            background: color,
            borderRadius: value >= 0 ? '0 6px 6px 0' : '6px 0 0 6px',
            transformOrigin: value >= 0 ? 'left center' : 'right center',
            transform: inView ? 'none' : 'scaleX(0)',
            transition: 'transform 1s var(--ease-out-soft) .5s',
          }}
        />
        <div className="absolute inset-y-[5px] left-1/2 w-0.5 -translate-x-1/2 bg-cocoa/30" />
        <div
          className="absolute top-[18px] size-6 rounded-full border-[5px] bg-white shadow-[0_4px_10px_-2px_rgb(46_36_32/0.35)]"
          style={{
            left: `${dot}%`,
            borderColor: color,
            transform: `translate(-50%, -50%) scale(${inView ? 1 : 0.3})`,
            opacity: inView ? 1 : 0,
            transition: 'transform .6s var(--ease-pop) 1.3s, opacity .3s ease 1.3s',
          }}
        />
      </div>
      <div className="flex justify-between text-xs font-semibold opacity-75">
        <span>Worse</span>
        <span>No change</span>
        <span>Better</span>
      </div>
    </div>
  )
}
