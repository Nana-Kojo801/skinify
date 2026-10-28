import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { CONCERNS, isConcernKey } from '@shared/concerns'

export type ScanResultData = {
  scores: Record<string, number>
  qualityFlag: boolean
}

export function ScanResult({ result }: { result: ScanResultData }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-medium">Scan saved</h2>
      {result.qualityFlag && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          The two photos disagreed quite a bit, so this scan is marked as lower quality. Next time use the same window
          light and distance for both.
        </p>
      )}
      <ul className="divide-y rounded-lg border text-sm">
        {Object.entries(result.scores).map(([concern, score]) => (
          <li key={concern} className="flex justify-between p-2">
            <span>{isConcernKey(concern) ? CONCERNS[concern].label : concern}</span>
            <span className="font-medium">{Math.round(score)}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-neutral-500">Scores run 1 to 100, higher is healthier. Your photos were not saved.</p>
      <Link to="/" className={buttonVariants()}>
        Back to products
      </Link>
    </div>
  )
}
