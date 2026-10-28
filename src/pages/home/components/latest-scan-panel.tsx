import { StatFigure } from '@/components/stat-figure'
import { formatDate } from '@/lib/format'
import { CONCERN_KEYS, CONCERNS } from '@shared/concerns'

type LatestScan = { createdAt: number; scores: Record<string, number>; qualityFlag: boolean } | null | undefined

// The newest scan's scores as big figures. Empty state explains why the first scan matters.
export function LatestScanPanel({ scan }: { scan: LatestScan }) {
  if (scan === undefined) return <div className="panel min-h-72 animate-pulse" aria-hidden />
  if (scan === null) {
    return (
      <div className="relative isolate flex min-h-72 flex-col justify-end overflow-hidden rounded-lg p-6">
        <img src="/images/skin-texture.jpg" alt="" className="absolute inset-0 -z-20 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-navy/50 to-transparent" />
        <h2 className="text-2xl font-light">
          Your first scan sets your <strong className="font-bold">baseline</strong>
        </h2>
        <p className="mt-2 max-w-md text-sm text-white/80">Scan before you start a product, so there is something to compare against.</p>
      </div>
    )
  }
  return (
    <div className="panel p-6 md:p-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-light">
          Latest <strong className="font-bold">scan</strong>
        </h2>
        <span className="text-sm text-muted-foreground">{formatDate(scan.createdAt)}</span>
      </div>
      <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4">
        {CONCERN_KEYS.filter((key) => scan.scores[key] !== undefined).map((key) => (
          <StatFigure key={key} size="md" value={String(Math.round(scan.scores[key]))} unit="/100" label={CONCERNS[key].label} />
        ))}
      </dl>
      <p className="mt-7 border-t border-white/10 pt-4 text-xs text-muted-foreground">
        Scores run 1 to 100. Higher is healthier.{scan.qualityFlag ? ' This scan is marked as lower quality.' : ''}
      </p>
    </div>
  )
}
