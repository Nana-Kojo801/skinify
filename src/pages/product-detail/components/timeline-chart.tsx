import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatShortDate } from '@/lib/format'

export type TimelinePoint = { createdAt: number; score: number }

/** Score of the targeted concern over time (higher = healthier), with a marker on the product's start date. */
export function TimelineChart({ points, startDate }: { points: TimelinePoint[]; startDate: number }) {
  if (points.length === 0) {
    return <p className="text-sm text-neutral-500">No scans yet. The chart appears after your first scan.</p>
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="createdAt"
            type="number"
            scale="time"
            domain={[Math.min(startDate, points[0].createdAt), 'dataMax']}
            tickFormatter={formatShortDate}
            tick={{ fontSize: 11 }}
          />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip
            labelFormatter={(value) => formatShortDate(Number(value))}
            formatter={(value) => [value, 'Score']}
          />
          <ReferenceLine x={startDate} stroke="#16a34a" strokeDasharray="4 2" label={{ value: 'Start', fontSize: 11, fill: '#16a34a' }} />
          <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
