import type { Verdict, VerdictInputs } from '@shared/verdict/verdict-types'
import { VerdictBadge } from '@/components/verdict-badge'

export type VerdictCardData = {
  verdict: Verdict
  summary: string
  rescanAdvice: string[]
  inputs: VerdictInputs
}

function formatPoints(value: number | null): string {
  if (value === null) return 'n/a'
  const rounded = Math.round(value * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}`
}

/** The verdict, the explanation text and the numbers behind it. `null` = no verdict computed yet. */
export function VerdictCard({ data }: { data: VerdictCardData | null }) {
  if (!data) {
    return (
      <section className="rounded-lg border p-3">
        <p className="text-sm text-neutral-500">Add scans to get a verdict.</p>
      </section>
    )
  }
  const { verdict, summary, rescanAdvice, inputs } = data
  return (
    <section className="flex flex-col gap-2 rounded-lg border p-3">
      <VerdictBadge verdict={verdict} />
      <p className="text-sm whitespace-pre-line">{summary}</p>
      {rescanAdvice.length > 0 && (
        <ul className="list-disc pl-5 text-sm">
          {rescanAdvice.map((advice) => (
            <li key={advice}>{advice}</li>
          ))}
        </ul>
      )}
      <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-neutral-600">
        <dt>Scans before start</dt>
        <dd>{inputs.baselineCount}</dd>
        <dt>Scans after start</dt>
        <dd>{inputs.postCount}</dd>
        <dt>Change</dt>
        <dd>{formatPoints(inputs.change)} points</dd>
        <dt>Noise</dt>
        <dd>±{Math.round(inputs.noise * 10) / 10} points</dd>
      </dl>
      <p className="text-xs text-neutral-500">Not medical advice. Ask a pharmacist or dermatologist about skin problems.</p>
    </section>
  )
}
