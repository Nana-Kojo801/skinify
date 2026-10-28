import { useInView } from '@/lib/motion'

/** A tiny trend line that draws itself when it scrolls into view. */
export function Sparkline({ values, color, width = 64, height = 30 }: { values: number[]; color: string; width?: number; height?: number }) {
  const [ref, inView] = useInView<SVGSVGElement>()
  if (values.length < 2) return <svg ref={ref} width={width} height={height} aria-hidden />
  const pad = 3
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const d = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - 2 * pad)
      const y = pad + (1 - (v - lo) / span) * (height - 2 * pad)
      return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg ref={ref} viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden>
      <path className="draw-line" data-shown={inView} pathLength={1} d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
