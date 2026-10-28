import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { CONCERNS, isConcernKey } from '@shared/concerns'

export type ScanResultData = {
  scores: Record<string, number>
  qualityFlag: boolean
}

export function ScanResult({ result }: { result: ScanResultData }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="display">
        Scan <strong>saved</strong>
      </h1>
      {result.qualityFlag && (
        <p className="rounded-2xl bg-amber-100 p-4 text-sm text-amber-900">
          The two photos disagreed quite a bit, so this scan is marked as lower quality. Next time use the same window light and
          distance for both.
        </p>
      )}
      <ul className="surface divide-y divide-border overflow-hidden">
        {Object.entries(result.scores).map(([concern, score]) => (
          <li key={concern} className="flex items-center justify-between px-5 py-3">
            <span>{isConcernKey(concern) ? CONCERNS[concern].label : concern}</span>
            <span className="text-xl font-semibold tracking-tight">{Math.round(score)}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Scores run 1 to 100, higher is healthier. Your photos were not saved.</p>
      <Link to="/" className={buttonVariants({ size: 'lg' })}>
        Back to products
      </Link>
    </div>
  )
}
