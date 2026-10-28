import { ArrowLeft } from '@phosphor-icons/react'
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

  if (product === undefined || scans === undefined) return <p className="p-5 text-sm text-muted-foreground">Loading…</p>
  if (product === null) return <p className="p-5 text-sm">Product not found.</p>

  const dayEnd = product.startDate + 86_400_000
  const before = scans.filter((scan) => scan.createdAt < dayEnd)
  const after = scans.filter((scan) => scan.createdAt >= dayEnd).slice(-2)

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-4 pb-12">
      <div>
        <Link
          to={`/products/${productId}`}
          aria-label={`Back to ${product.name}`}
          className="mb-3 flex size-10 items-center justify-center rounded-full bg-secondary active:scale-95"
        >
          <ArrowLeft size={20} weight="bold" />
        </Link>
        <h1 className="display">
          Before and <strong>after</strong>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {product.name}, started {formatDate(product.startDate)}. Scores run 1 to 100, higher is healthier.
        </p>
      </div>

      {before.length === 0 || after.length === 0 ? (
        <p className="surface p-5 text-sm">
          {before.length === 0
            ? 'No scans from before the start date, so there is nothing to compare against.'
            : 'No scans after the start date yet. Scan again to see a comparison.'}
        </p>
      ) : (
        <div className="surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Concern</th>
                <th className="px-2 py-3 text-right font-medium">Before</th>
                <th className="px-2 py-3 text-right font-medium">After</th>
                <th className="px-4 py-3 text-right font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {CONCERN_KEYS.map((key) => {
                const b = mean(before.flatMap((scan) => (scan.scores[key] === undefined ? [] : [scan.scores[key]])))
                const a = mean(after.flatMap((scan) => (scan.scores[key] === undefined ? [] : [scan.scores[key]])))
                const diff = b !== null && a !== null ? a - b : null
                const isTarget = key === product.targetConcern
                return (
                  <tr key={key} className={isTarget ? 'bg-primary/10 font-semibold text-primary' : 'border-t border-border'}>
                    <td className="px-4 py-3">
                      {CONCERNS[key].label}
                      {isTarget && <span className="block text-xs font-normal">Target</span>}
                    </td>
                    <td className="px-2 py-3 text-right">{b === null ? 'n/a' : Math.round(b)}</td>
                    <td className="px-2 py-3 text-right">{a === null ? 'n/a' : Math.round(a)}</td>
                    <td className="px-4 py-3 text-right">{diff === null ? 'n/a' : Math.round(diff) === 0 ? '0' : `${diff > 0 ? '+' : ''}${Math.round(diff)}`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Before: {before.length} scan{before.length === 1 ? '' : 's'}. After: the latest {after.length}. Small changes can be measurement
        noise. The verdict on the product page accounts for that; this table does not.
      </p>
    </main>
  )
}
