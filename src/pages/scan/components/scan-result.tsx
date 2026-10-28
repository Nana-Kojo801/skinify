import { Link } from 'react-router'
import { StatFigure } from '@/components/stat-figure'
import { buttonVariants } from '@/components/ui/button'
import { CONCERN_KEYS, CONCERNS } from '@shared/concerns'

export type ScanResultData = {
  scores: Record<string, number>
  qualityFlag: boolean
}

export function ScanResult({ result }: { result: ScanResultData }) {
  return (
    <div className="flex flex-col gap-9">
      <h1 className="heading rise text-5xl md:text-6xl">
        Scan <strong>saved</strong>
      </h1>
      {result.qualityFlag && (
        <p className="rounded-lg bg-taupe p-5 text-white">
          The two photos disagreed quite a bit, so this scan is marked as lower quality. Next time use the same window light and
          distance for both.
        </p>
      )}
      <dl className="panel grid grid-cols-2 gap-x-6 gap-y-8 p-6 sm:grid-cols-4 md:p-8">
        {CONCERN_KEYS.filter((key) => result.scores[key] !== undefined).map((key) => (
          <StatFigure key={key} size="md" value={String(Math.round(result.scores[key]))} unit="/100" label={CONCERNS[key].label} />
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">Scores run 1 to 100, higher is healthier. Your photos were not saved.</p>
      <Link to="/" className={buttonVariants({ size: 'lg' }) + ' self-start'}>
        Back to products
      </Link>
    </div>
  )
}
