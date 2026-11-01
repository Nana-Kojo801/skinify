import { useEffect, useId, useState } from 'react'
import { formatShortDate } from '@/lib/format'

export type ScorePoint = { createdAt: number; score: number; flagged?: boolean }

/** A time-proportional 0–100 plot. Baselines are actual measured scores, never a decorative series. */
export function ScoreChart({ points, baseline, startDate, label = 'Skin score' }: { points: ScorePoint[]; baseline?: number | null; startDate?: number; label?: string }) {
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)
  const titleId = useId()
  useEffect(() => {
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])
  const sorted = [...points].sort((a, b) => a.createdAt - b.createdAt)
  if (!sorted.length) return <p className="empty-chart">Your first scan starts the timeline.</p>
  const height = 225
  const pad = { left: 30, right: 12, top: 19, bottom: 31 }
  const w = Math.max(width, 200)
  const first = Math.min(sorted[0].createdAt, startDate ?? Infinity)
  const last = Math.max(sorted.at(-1)!.createdAt, startDate ?? -Infinity, first + 86400000)
  const x = (time: number) => pad.left + (time - first) / (last - first) * (w - pad.left - pad.right)
  const y = (value: number) => pad.top + (100 - Math.max(0, Math.min(100, value))) / 100 * (height - pad.top - pad.bottom)
  const step = Math.max(1, Math.ceil(sorted.length / (width < 480 ? 4 : 7)))
  const ticks = sorted.filter((p, i) => i === 0 || i === sorted.length - 1 || (i % step === 0 && x(sorted.at(-1)!.createdAt) - x(p.createdAt) >= 58))
  return (
    <div className="score-chart" ref={setNode}>
      {width > 0 && <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} role="img" aria-labelledby={titleId}>
        <title id={titleId}>{label}: {sorted.map(p => `${formatShortDate(p.createdAt)} ${Math.round(p.score)}${p.flagged ? ', lower quality' : ''}`).join('; ')}</title>
        {[0, 25, 50, 75, 100].map(value => <g key={value}><line x1={pad.left} x2={w - pad.right} y1={y(value)} y2={y(value)} stroke="var(--color-hair)" /><text x="0" y={y(value) + 4} fill="var(--color-ink-3)" className="text-xs">{value}</text></g>)}
        {ticks.map(p => <g key={p.createdAt}><line x1={x(p.createdAt)} x2={x(p.createdAt)} y1={pad.top} y2={height - pad.bottom} stroke="var(--color-hair)" /><text x={Math.max(38, Math.min(w - 24, x(p.createdAt)))} y={height - 9} fill="var(--color-ink-3)" className="text-xs" textAnchor="middle">{formatShortDate(p.createdAt)}</text></g>)}
        {baseline != null && <line x1={pad.left} x2={w - pad.right} y1={y(baseline)} y2={y(baseline)} stroke="#82848a" strokeWidth="1.5" />}
        {startDate != null && <line x1={x(startDate)} x2={x(startDate)} y1={pad.top} y2={height - pad.bottom} stroke="#b5b5b8" strokeDasharray="3 5"><title>Product started {formatShortDate(startDate)}</title></line>}
        <path className="draw-in" pathLength="1" d={sorted.map((p, i) => `${i ? 'L' : 'M'}${x(p.createdAt)},${y(p.score)}`).join(' ')} stroke="var(--color-primary)" strokeWidth="2" fill="none" strokeLinejoin="round" />
        {sorted.map(p => <circle key={p.createdAt} cx={x(p.createdAt)} cy={y(p.score)} r={width < 480 ? 3.5 : 4} fill={p.flagged ? 'var(--color-fog)' : 'var(--color-primary)'} stroke="var(--color-primary)" strokeWidth="1.5"><title>{formatShortDate(p.createdAt)}: {Math.round(p.score)}{p.flagged ? ' · lower quality' : ''}</title></circle>)}
      </svg>}
      <div className="chart-legend"><span><i />Your skin</span>{baseline != null && <span><i className="baseline-dot" />{startDate ? 'Baseline' : 'First scan'}</span>}<span className="chart-direction">Higher is healthier</span></div>
      {sorted.some(p => p.flagged) && <p className="chart-quality">Hollow points indicate lower-quality scans.</p>}
    </div>
  )
}
