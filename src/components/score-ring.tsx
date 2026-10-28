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
  numberClassName?: string
  labelClassName?: string
  /** Stagger index: each ring starts 70 ms after the previous one. */
  index?: number
}

// A score as a ring that fills and counts up when it scrolls into view. The fill is a CSS transition on
// stroke-dashoffset (one small SVG per ring), the number is written to the DOM directly (see useCountUp).
export function ScoreRing({ value, label, size = 62, stroke = 'var(--color-coral)', numberClassName, labelClassName, index = 0 }: ScoreRingProps) {
  const [ref, inView] = useInView<HTMLDivElement>()
  const clamped = Math.max(0, Math.min(100, value))
  const delay = `${index * 70}ms`
  return (
    <div ref={ref} className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden>
          <circle cx="32" cy="32" r="27" fill="none" stroke="var(--color-ring-track)" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r="27"
            fill="none"
            stroke={stroke}
            strokeWidth="6"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100 100"
            style={{
              strokeDashoffset: inView ? 100 - clamped : 100,
              transition: `stroke-dashoffset 1.3s var(--ease-out-soft) ${delay}`,
            }}
          />
        </svg>
        <span className={cn('absolute inset-0 grid place-items-center text-[19px] font-semibold tracking-[-0.02em] tabular-nums', numberClassName)}>
          <CountUp value={Math.round(value)} start={inView} />
        </span>
      </div>
      {label && <span className={cn('text-xs font-medium text-muted', labelClassName)}>{label}</span>}
    </div>
  )
}
