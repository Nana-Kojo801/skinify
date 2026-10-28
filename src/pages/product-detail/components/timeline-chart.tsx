import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatShortDate } from '@/lib/format'

export type TimelinePoint = { createdAt: number; score: number }

// Recharts draws SVG attributes, which don't resolve CSS variables reliably, so the palette is spelled out here.
const LINE = '#f5f3f0'
const MUTED = '#a9acbd'
const TAUPE_LIGHT = '#cbb9a6'

/** Score of the targeted concern over time (higher = healthier), with a marker on the product's start date. */
export function TimelineChart({ points, startDate }: { points: TimelinePoint[]; startDate: number }) {
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">No scans yet. The chart appears after your first scan.</p>
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 16, right: 8, bottom: 0, left: -22 }}>
          <defs>
            <linearGradient id="score-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE} stopOpacity={0.22} />
              <stop offset="100%" stopColor={LINE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis
            dataKey="createdAt"
            type="number"
            scale="time"
            domain={[Math.min(startDate, points[0].createdAt), 'dataMax']}
            tickFormatter={formatShortDate}
            tick={{ fontSize: 12, fill: MUTED }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: MUTED }} axisLine={false} tickLine={false} />
          <Tooltip
            labelFormatter={(value) => formatShortDate(Number(value))}
            formatter={(value) => [value, 'Score']}
            contentStyle={{ background: '#0d1433', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', color: LINE }}
            itemStyle={{ color: LINE }}
          />
          <ReferenceLine
            x={startDate}
            stroke={TAUPE_LIGHT}
            strokeDasharray="4 4"
            label={{ value: 'Started', fontSize: 12, fill: TAUPE_LIGHT, position: 'insideTopRight' }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke={LINE}
            strokeWidth={2}
            fill="url(#score-fill)"
            dot={{ r: 3.5, fill: '#070c26', stroke: LINE, strokeWidth: 2 }}
            activeDot={{ r: 5, fill: LINE }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
