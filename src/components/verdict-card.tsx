import type { Verdict, VerdictInputs } from '@shared/verdict/verdict-types'
import { VERDICT_CLASSES, VERDICT_LABELS } from '@/lib/verdict-display'

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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary px-3 py-2.5">
      <dd className="text-lg font-semibold tracking-tight">{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  )
}

/** The verdict, the explanation text and the numbers behind it. `null` = no verdict computed yet. */
export function VerdictCard({ data }: { data: VerdictCardData | null }) {
  if (!data) {
    return (
      <section className="surface p-5">
        <h2 className="text-xl font-semibold tracking-tight">No verdict yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">Add scans to get a verdict.</p>
      </section>
    )
  }
  const { verdict, summary, rescanAdvice, inputs } = data
  return (
    <section className="surface overflow-hidden">
      <div className={`px-5 py-4 ${VERDICT_CLASSES[verdict]}`}>
        <p className="text-xs font-medium opacity-80">Verdict</p>
        <h2 className="text-3xl leading-tight font-semibold tracking-tight">{VERDICT_LABELS[verdict]}</h2>
      </div>
      <div className="flex flex-col gap-4 p-5">
        <p className="text-base leading-relaxed whitespace-pre-line">{summary}</p>
        {rescanAdvice.length > 0 && (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {rescanAdvice.map((advice) => (
              <li key={advice}>{advice}</li>
            ))}
          </ul>
        )}
        <dl className="grid grid-cols-2 gap-2">
          <Stat label="Scans before start" value={String(inputs.baselineCount)} />
          <Stat label="Scans after start" value={String(inputs.postCount)} />
          <Stat label="Change (points)" value={formatPoints(inputs.change)} />
          <Stat label="Noise (points)" value={`±${Math.round(inputs.noise * 10) / 10}`} />
        </dl>
        <p className="text-xs text-muted-foreground">
          Not medical advice. Ask a pharmacist or dermatologist about skin problems.
        </p>
      </div>
    </section>
  )
}
