import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatShortDate } from '@/lib/format'

export type TimelinePoint = { createdAt: number; score: number }

// Recharts draws SVG attributes, which don't resolve CSS variables reliably, so the accent is spelled out here.
const ACCENT = '#1f6174'

/** Score of the targeted concern over time (higher = healthier), with a marker on the product's start date. */
export function TimelineChart({ points, startDate }: { points: TimelinePoint[]; startDate: number }) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">No scans yet. The chart appears after your first scan.</p>
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="score-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.25} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#d9e3e7" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey="createdAt"
            type="number"
            scale="time"
            domain={[Math.min(startDate, points[0].createdAt), 'dataMax']}
            tickFormatter={formatShortDate}
            tick={{ fontSize: 11, fill: '#5b7480' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#5b7480' }} axisLine={false} tickLine={false} />
          <Tooltip
            labelFormatter={(value) => formatShortDate(Number(value))}
            formatter={(value) => [value, 'Score']}
            contentStyle={{ borderRadius: 16, border: '1px solid #d9e3e7', boxShadow: 'none' }}
          />
          <ReferenceLine x={startDate} stroke="#0f766e" strokeDasharray="4 3" label={{ value: 'Start', fontSize: 11, fill: '#0f766e', position: 'insideTopRight' }} />
          <Area
            type="monotone"
            dataKey="score"
            stroke={ACCENT}
            strokeWidth={2.5}
            fill="url(#score-fill)"
            dot={{ r: 3.5, fill: '#fff', stroke: ACCENT, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
