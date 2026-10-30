import { cn } from '@/lib/utils'
import type { Evidence } from '@shared/verdict/evidence'

// "Evidence: Solid": how firm the measurement behind a verdict is, with the facts behind the label. It rates the
// measurement, not the product, and never promises what more scans will show.
export function EvidenceStrip({ evidence, color }: { evidence: Evidence; color: string }) {
  return (
    <div className="mt-4 rounded-3xl bg-white/75 px-4 py-3.5 text-cocoa">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-bold">Evidence</h3>
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-bold text-white"
          style={{ background: color }}
          aria-label={`${evidence.label} evidence`}
        >
          {evidence.label}
          <span className="flex gap-[3px]" aria-hidden>
            {[1, 2, 3].map((n) => (
              <i key={n} className={cn('h-1.5 w-3.5 rounded-full bg-white/40', n <= evidence.bars && 'bg-white')} />
            ))}
          </span>
        </span>
      </div>
      <ul className="mt-2.5 flex flex-col gap-1 text-[14px] leading-snug">
        {evidence.facts.map((fact) => (
          <li key={fact} className="relative pl-4 before:absolute before:top-[0.55em] before:left-0.5 before:size-1.5 before:rounded-full before:bg-current before:opacity-60">
            {fact}
          </li>
        ))}
      </ul>
      <p className="mt-2.5 border-t border-cocoa/10 pt-2.5 text-[13.5px] leading-snug">{evidence.next}</p>
      <p className="mt-1.5 text-[12px] text-cocoa/70">{evidence.note}</p>
    </div>
  )
}
