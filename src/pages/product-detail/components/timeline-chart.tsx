import { useEffect, useState } from 'react'
import { useInView } from '@/lib/motion'
import { formatShortDate } from '@/lib/format'

export type TimelinePoint = { createdAt: number; score: number; flagged: boolean }

const HEIGHT = 200
const PAD = { top: 26, right: 10, bottom: 10, left: 30 }

/** Width of an element, kept up to date (so the chart draws at real pixel size: crisp text on every screen). */
function useWidth<T extends Element>() {
  const [node, setNode] = useState<T | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])
  return [setNode as (instance: T | null) => void, width] as const
}

/** Smooth line through the points (Catmull-Rom as cubic Béziers). */
function smoothPath(points: [number, number][]): string {
  if (points.length === 1) return `M${points[0][0]} ${points[0][1]}`
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

/** Score of the targeted concern over time (higher = healthier), with a marker on the product's start date. */
export function TimelineChart({ points, startDate, color }: { points: TimelinePoint[]; startDate: number; color: string }) {
  const [boxRef, width] = useWidth<HTMLDivElement>()
  const [viewRef, inView] = useInView<HTMLDivElement>()

  if (points.length === 0) {
    return <p className="text-sm text-ink-2">No scans yet. The chart appears after your first scan.</p>
  }

  const scores = points.map((p) => p.score)
  const lo = Math.max(0, Math.floor((Math.min(...scores) - 5) / 5) * 5)
  const hi = Math.min(100, Math.ceil((Math.max(...scores) + 5) / 5) * 5)
  const t0 = Math.min(startDate, points[0].createdAt)
  const t1 = Math.max(points[points.length - 1].createdAt, t0 + 86_400_000)
  const w = Math.max(width, 200)
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * (w - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo || 1)) * (HEIGHT - PAD.top - PAD.bottom)
  const xy = points.map((p) => [x(p.createdAt), y(p.score)] as [number, number])
  const line = smoothPath(xy)
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)} ${HEIGHT} L${xy[0][0].toFixed(1)} ${HEIGHT} Z`
  const mid = Math.round((lo + hi) / 2)
  const sx = x(startDate)
  const labelX = Math.min(Math.max(sx, PAD.left + 30), w - 32)

  return (
    <div ref={viewRef}>
      <div ref={boxRef} className="w-full" style={{ height: HEIGHT }}>
        {width > 0 && inView && (
          <svg width={w} height={HEIGHT} viewBox={`0 0 ${w} ${HEIGHT}`} role="img" aria-label={`Score for each scan, from ${Math.round(scores[0])} to ${Math.round(scores[scores.length - 1])}`} className="block overflow-visible">
            <rect x={PAD.left} y={PAD.top - 4} width={Math.max(0, sx - PAD.left)} height={HEIGHT - PAD.top - PAD.bottom + 4} rx={8} fill="rgb(14 23 38 / 0.035)" />
            {[hi, mid, lo].map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={w} y1={y(v)} y2={y(v)} stroke="rgb(14 23 38 / 0.07)" />
                <text x={0} y={y(v) + 4} className="text-xs font-medium" fill="var(--color-ink-3)">
                  {v}
                </text>
              </g>
            ))}
            <line x1={sx} x2={sx} y1={PAD.top - 2} y2={HEIGHT - 2} stroke="var(--color-ink)" strokeWidth="1.5" strokeDasharray="4 4" />
            <rect x={labelX - 29} y={2} width={58} height={20} rx={10} fill="var(--color-accent)" />
            <text x={labelX} y={16} className="text-xs font-semibold" textAnchor="middle" fill="var(--color-ink)">
              Started
            </text>
            <path d={area} fill={color} opacity={0.12} className="fade-in" style={{ '--d': '.7s' } as React.CSSProperties} />
            <path className="draw-in" pathLength={1} d={line} fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
            {points.map((p, i) => (
              <circle
                key={p.createdAt}
                cx={xy[i][0]}
                cy={xy[i][1]}
                r={4.5}
                fill="#fff"
                stroke={p.flagged ? 'var(--color-canttell)' : p.createdAt < startDate + 86_400_000 ? 'var(--color-ink-3)' : color}
                strokeWidth={2.5}
                className="fade-in"
                style={{ '--d': `${0.5 + i * 0.08}s` } as React.CSSProperties}
              >
                <title>{`${formatShortDate(p.createdAt)}: ${Math.round(p.score)}${p.flagged ? ' (lower quality)' : ''}`}</title>
              </circle>
            ))}
          </svg>
        )}
      </div>
      <div className="mt-1 flex justify-between pl-[30px] text-xs font-semibold text-ink-3">
        <span>{formatShortDate(t0)}</span>
        <span>{formatShortDate(t1)}</span>
      </div>
      {points.some((p) => p.flagged) && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ink-2">
          <span className="inline-block size-2.5 rounded-full border-[2.5px] border-canttell" />
          Lower quality scan: the two photos disagreed
        </p>
      )}
    </div>
  )
}
