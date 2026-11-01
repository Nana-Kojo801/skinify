import { cn } from '@/lib/utils'
import type { Evidence } from '@shared/verdict/evidence'

// "Evidence: Solid": how firm the measurement behind a verdict is, with the facts behind the label. It rates the
// measurement, not the product, and never promises what more scans will show.
export function EvidenceStrip({ evidence, color }: { evidence: Evidence; color: string }) {
  return (
    <div className="rounded-[22px] bg-white/60 p-4 shadow-[inset_0_1px_0_#fff,inset_0_0_0_1px_rgb(255_255_255/0.5)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-eyebrow font-semibold tracking-eyebrow uppercase">Evidence</h3>
        <span
          className="inline-flex h-[30px] items-center gap-2 rounded-full px-3 text-xs font-semibold text-fog"
          style={{ background: color }}
          aria-label={`${evidence.label} evidence`}
        >
          {evidence.label}
          <span className="flex gap-[3px]" aria-hidden>
            {[1, 2, 3].map((n) => (
              <i key={n} className={cn('h-1.5 w-3.5 rounded-full bg-fog/30', n <= evidence.bars && 'bg-fog')} />
            ))}
          </span>
        </span>
      </div>
      <ul className="mt-2.5 flex flex-col gap-1.5 text-sm leading-snug font-semibold">
        {evidence.facts.map((fact) => (
          <li key={fact} className="relative pl-4 before:absolute before:top-[0.5em] before:left-0.5 before:size-1.5 before:rounded-full before:bg-current before:opacity-50">
            {fact}
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-sm leading-snug">{evidence.next}</p>
      <p className="mt-1.5 text-xs opacity-75">{evidence.note}</p>
    </div>
  )
}
