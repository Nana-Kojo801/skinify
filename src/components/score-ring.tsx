import { CountUp } from '@/components/count-up'
import { useInView } from '@/lib/motion'
import { cn } from '@/lib/utils'

type ScoreRingProps = {
  /** 0 to 100 */
  value: number
  label?: string
  /** Ring diameter in px. */
  size?: number
  stroke?: string
  /** Stroke width in viewBox units (the ring is drawn in a 64-unit box). */
  thickness?: number
  numberClassName?: string
  labelClassName?: string
  /** Stagger index: each ring starts 70 ms after the previous one. */
  index?: number
}

// A score as a ring that fills and counts up when it scrolls into view. The fill is a CSS transition on
// stroke-dashoffset (one small SVG per ring), the number is written to the DOM directly (see useCountUp).
export function ScoreRing({ value, label, size = 62, stroke = 'var(--color-ink)', thickness = 6, numberClassName, labelClassName, index = 0 }: ScoreRingProps) {
  const [ref, inView] = useInView<HTMLDivElement>()
  const clamped = Math.max(0, Math.min(100, value))
  const delay = `${150 + index * 70}ms`
  const r = 32 - thickness / 2 - 1
  return (
    <div ref={ref} className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden>
          <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(35 24 29 / 0.08)" strokeWidth={thickness} />
          <circle
            cx="32"
            cy="32"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth={thickness}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100 100"
            style={{
              strokeDashoffset: inView ? 100 - clamped : 100,
              transition: `stroke-dashoffset 1.4s var(--ease-liquid) ${delay}`,
            }}
          />
        </svg>
        <span className={cn('absolute inset-0 grid place-items-center text-[19px] font-extrabold tracking-[-0.03em] tabular-nums', numberClassName)}>
          <CountUp value={Math.round(value)} start={inView} />
        </span>
      </div>
      {label && <span className={cn('text-center text-xs font-bold text-ink-2', labelClassName)}>{label}</span>}
    </div>
  )
}
