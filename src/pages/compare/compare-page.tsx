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

  if (product === undefined || scans === undefined) return <p className="mx-auto max-w-4xl p-8 text-muted-foreground">Loading…</p>
  if (product === null) return <p className="p-5 text-sm">Product not found.</p>

  const dayEnd = product.startDate + 86_400_000
  const before = scans.filter((scan) => scan.createdAt < dayEnd)
  const after = scans.filter((scan) => scan.createdAt >= dayEnd).slice(-2)

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-9 px-5 pt-6 pb-20 md:px-8 md:pt-10">
      <div>
        <Link
          to={`/products/${productId}`}
          aria-label={`Back to ${product.name}`}
          className="mb-6 flex size-11 items-center justify-center rounded-full border border-white/30 transition-colors hover:border-white/70"
        >
          <ArrowLeft size={20} weight="bold" />
        </Link>
        <h1 className="heading text-5xl md:text-6xl">
          Before and <strong>after</strong>
        </h1>
        <p className="mt-3 text-lg text-white/75">
          {product.name}, started {formatDate(product.startDate)}. Scores run 1 to 100, higher is healthier.
        </p>
      </div>

      {before.length === 0 || after.length === 0 ? (
        <p className="rounded-lg bg-taupe p-6 text-white">
          {before.length === 0
            ? 'No scans from before the start date, so there is nothing to compare against.'
            : 'No scans after the start date yet. Scan again to see a comparison.'}
        </p>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left text-sm text-muted-foreground">
                <th className="px-5 py-4 font-normal">Concern</th>
                <th className="px-3 py-4 text-right font-normal">Before</th>
                <th className="px-3 py-4 text-right font-normal">After</th>
                <th className="px-5 py-4 text-right font-normal">Change</th>
              </tr>
            </thead>
            <tbody>
              {CONCERN_KEYS.map((key) => {
                const b = mean(before.flatMap((scan) => (scan.scores[key] === undefined ? [] : [scan.scores[key]])))
                const a = mean(after.flatMap((scan) => (scan.scores[key] === undefined ? [] : [scan.scores[key]])))
                const diff = b !== null && a !== null ? a - b : null
                const isTarget = key === product.targetConcern
                return (
                  <tr key={key} className={isTarget ? 'bg-taupe text-white' : 'border-t border-white/10'}>
                    <td className="px-5 py-4">
                      <span className={isTarget ? 'font-bold' : ''}>{CONCERNS[key].label}</span>
                      {isTarget && <span className="block text-xs text-white/80">Target concern</span>}
                    </td>
                    <td className="px-3 py-4 text-right text-xl tabular-nums">{b === null ? 'n/a' : Math.round(b)}</td>
                    <td className="px-3 py-4 text-right text-xl tabular-nums">{a === null ? 'n/a' : Math.round(a)}</td>
                    <td className="px-5 py-4 text-right text-xl font-medium tabular-nums">
                      {diff === null ? 'n/a' : Math.round(diff) === 0 ? '0' : `${diff > 0 ? '+' : ''}${Math.round(diff)}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Before: {before.length} scan{before.length === 1 ? '' : 's'}. After: the latest {after.length}. Small changes can be measurement
        noise. The verdict on the product page accounts for that; this table does not.
      </p>
    </main>
  )
}
