import { Quotes } from '@phosphor-icons/react'
import type { Verdict, VerdictInputs } from '@shared/verdict/verdict-types'
import { StatFigure } from '@/components/stat-figure'

export type VerdictCardData = {
  verdict: Verdict
  summary: string
  rescanAdvice: string[]
  inputs: VerdictInputs
}

function formatPoints(value: number | null): string {
  if (value === null) return 'n/a'
  const rounded = Math.round(value * 10) / 10
  return rounded === 0 ? '0' : `${rounded > 0 ? '+' : ''}${rounded}`
}

/** The numbers behind a verdict, as big figures. */
export function VerdictFigures({ inputs }: { inputs: VerdictInputs }) {
  return (
    <dl className="grid grid-cols-2 gap-x-8 gap-y-8">
      <StatFigure value={formatPoints(inputs.change)} unit="pts" label="Change since start" />
      <StatFigure value={`±${Math.round(inputs.noise * 10) / 10}`} unit="pts" label="Measurement noise" />
      <StatFigure value={String(inputs.baselineCount)} label="Scans before start" />
      <StatFigure value={String(inputs.postCount)} label="Scans after start" />
    </dl>
  )
}

/** The explanation, on the taupe panel the reference site uses for reviews. `null` = no verdict computed yet. */
export function VerdictCard({ data }: { data: VerdictCardData | null }) {
  if (!data) {
    return (
      <section className="rounded-lg bg-taupe p-6 md:p-8">
        <h2 className="text-2xl font-light">
          No <strong className="font-bold">verdict</strong> yet
        </h2>
        <p className="mt-2 text-white/85">Add scans to get a verdict.</p>
      </section>
    )
  }
  const { summary, rescanAdvice } = data
  return (
    <section className="rounded-lg bg-taupe p-6 md:p-8">
      <Quotes size={40} weight="fill" className="text-white" />
      <p className="mt-5 text-lg leading-relaxed whitespace-pre-line text-white">{summary}</p>
      {rescanAdvice.length > 0 && (
        <ul className="mt-5 flex flex-col gap-2 border-t border-white/20 pt-5 text-sm text-white/90">
          {rescanAdvice.map((advice) => (
            <li key={advice}>{advice}</li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-white/75">Not medical advice. Ask a pharmacist or dermatologist about skin problems.</p>
    </section>
  )
}
