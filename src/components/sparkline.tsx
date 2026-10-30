import { useInView } from '@/lib/motion'

/** A tiny trend line with a soft area fill and an end dot. It draws itself when it scrolls into view. */
export function Sparkline({ values, color, width = 86, height = 34 }: { values: number[]; color: string; width?: number; height?: number }) {
  const [ref, inView] = useInView<SVGSVGElement>()
  if (values.length < 2) return <svg ref={ref} width={width} height={height} aria-hidden />
  const pad = 4
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const points = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - 2 * pad), pad + (1 - (v - lo) / span) * (height - 2 * pad)] as const)
  const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const [lastX, lastY] = points[points.length - 1]
  return (
    <svg ref={ref} viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden className="overflow-visible">
      <path
        d={`${d} L${lastX.toFixed(1)} ${height} L${pad} ${height}Z`}
        fill={color}
        style={{ opacity: inView ? 0.14 : 0, transition: 'opacity .8s ease .6s' }}
      />
      <path className="draw-line" data-shown={inView} pathLength={1} d={d} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={lastX}
        cy={lastY}
        r="3.4"
        fill={color}
        style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: `scale(${inView ? 1 : 0})`, transition: 'transform .5s var(--ease-spring) 1.2s' }}
      />
    </svg>
  )
}
