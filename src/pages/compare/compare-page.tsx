import { useQuery } from 'convex/react'
import { Link, useParams } from 'react-router'
import { formatDate } from '@/lib/format'
import { CONCERN_KEYS, CONCERNS } from '@shared/concerns'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length
}

// Before = average of the scans before the start date. After = average of the latest 2 scans from the start date on.
// Same definitions as the verdict engine (scans on the start day count as "before").
export function ComparePage() {
  const { id } = useParams()
  const productId = id as Id<'products'>
  const product = useQuery(api.products.get, { productId })
  const scans = useQuery(api.scans.list)

  if (product === undefined || scans === undefined) return <p className="p-4 text-sm text-neutral-500">Loading…</p>
  if (product === null) return <p className="p-4 text-sm">Product not found.</p>

  const dayEnd = product.startDate + 86_400_000
  const before = scans.filter((scan) => scan.createdAt < dayEnd)
  const after = scans.filter((scan) => scan.createdAt >= dayEnd).slice(-2)

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 p-4">
      <div>
        <Link to={`/products/${productId}`} className="text-sm underline">
          ← {product.name}
        </Link>
        <h1 className="text-xl font-semibold">Before / after</h1>
        <p className="text-sm text-neutral-500">Started {formatDate(product.startDate)}. Scores run 1 to 100, higher is healthier.</p>
      </div>

      {before.length === 0 || after.length === 0 ? (
        <p className="rounded-lg border p-3 text-sm">
          {before.length === 0
            ? 'No scans from before the start date, so there is nothing to compare against.'
            : 'No scans after the start date yet. Scan again to see a comparison.'}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-500">
              <th className="py-1 font-normal">Concern</th>
              <th className="py-1 text-right font-normal">Before ({before.length})</th>
              <th className="py-1 text-right font-normal">After ({after.length})</th>
              <th className="py-1 text-right font-normal">Change</th>
            </tr>
          </thead>
          <tbody>
            {CONCERN_KEYS.map((key) => {
              const b = mean(before.flatMap((scan) => (scan.scores[key] === undefined ? [] : [scan.scores[key]])))
              const a = mean(after.flatMap((scan) => (scan.scores[key] === undefined ? [] : [scan.scores[key]])))
              const diff = b !== null && a !== null ? a - b : null
              const isTarget = key === product.targetConcern
              return (
                <tr key={key} className={`border-t ${isTarget ? 'bg-neutral-50 font-medium' : ''}`}>
                  <td className="py-2">{CONCERNS[key].label}{isTarget ? ' (target)' : ''}</td>
                  <td className="py-2 text-right">{b === null ? 'n/a' : Math.round(b)}</td>
                  <td className="py-2 text-right">{a === null ? 'n/a' : Math.round(a)}</td>
                  <td className="py-2 text-right">{diff === null ? 'n/a' : `${diff > 0 ? '+' : ''}${Math.round(diff)}`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <p className="text-xs text-neutral-500">
        Small changes can be measurement noise. The verdict on the product page accounts for that; this table does not.
      </p>
    </main>
  )
}
