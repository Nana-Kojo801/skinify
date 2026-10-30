export type RadarAxis = { label: string; before: number; now: number }

const RADIUS = 100
const LABEL_RADIUS = 120

// A hand-drawn radar chart (no chart library, like the app's other charts): one spoke per axis, scores 0 to 100 from
// the centre out. "Before" is a dashed grey shape, "Now" a coral one. Decorative: the same facts are listed as text.
export function RadarChart({ axes, className }: { axes: RadarAxis[]; className?: string }) {
  const n = axes.length
  const point = (index: number, value: number, radius = RADIUS) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / n
    const r = (radius * Math.max(0, Math.min(100, value))) / 100
    return [Math.cos(angle) * r, Math.sin(angle) * r] as const
  }
  const polygon = (pick: (axis: RadarAxis) => number) => axes.map((axis, i) => point(i, pick(axis)).map((c) => c.toFixed(1)).join(',')).join(' ')

  return (
    <svg viewBox="-190 -150 380 300" role="img" aria-label="Radar chart of your skin scores: first scan compared with your latest scan" className={className}>
      {[25, 50, 75, 100].map((ring) => (
        <polygon key={ring} points={axes.map((_, i) => point(i, ring).join(',')).join(' ')} fill="none" stroke="var(--color-nude)" strokeWidth="1" />
      ))}
      {axes.map((axis, i) => {
        const [x, y] = point(i, 100)
        const [lx, ly] = point(i, 100, LABEL_RADIUS)
        const anchor = Math.abs(lx) < 8 ? 'middle' : lx > 0 ? 'start' : 'end'
        return (
          <g key={axis.label}>
            <line x1={0} y1={0} x2={x} y2={y} stroke="var(--color-nude)" />
            <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" fontSize="12" fontWeight="600" fill="var(--color-cocoa-soft)">
              {axis.label}
            </text>
          </g>
        )
      })}
      <polygon points={polygon((a) => a.before)} fill="#cdbdb1" fillOpacity="0.25" stroke="#b3a397" strokeWidth="2" strokeDasharray="5 4" />
      <polygon points={polygon((a) => a.now)} fill="var(--color-coral)" fillOpacity="0.28" stroke="var(--color-coral)" strokeWidth="2.5" strokeLinejoin="round" />
      {axes.map((axis, i) => {
        const [x, y] = point(i, axis.now)
        return <circle key={axis.label} cx={x} cy={y} r="3.5" fill="var(--color-coral)" />
      })}
    </svg>
  )
}
