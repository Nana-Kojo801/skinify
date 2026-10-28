import { useCountUp } from '@/lib/motion'

const whole = (n: number) => String(Math.round(n))

/** A number that counts up from 0 once `start` is true (by default straight away). */
export function CountUp({
  value,
  format = whole,
  start = true,
  duration,
  className,
}: {
  value: number
  format?: (n: number) => string
  start?: boolean
  duration?: number
  className?: string
}) {
  const ref = useCountUp<HTMLSpanElement>(value, format, start, duration)
  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  )
}
