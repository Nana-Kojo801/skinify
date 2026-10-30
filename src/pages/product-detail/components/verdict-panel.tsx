import { CountUp } from '@/components/count-up'
import { SignalMeter } from '@/components/signal-meter'
import { useInView } from '@/lib/motion'
import { formatPoints, formatSigned } from '@/lib/format'
import { VERDICT_LABELS, VERDICT_STYLE, verdictHeadline } from '@/lib/verdict-display'
import { cn } from '@/lib/utils'
import { CONCERNS, isConcernKey } from '@shared/concerns'
import { describeEvidence } from '@shared/verdict/evidence'
import { VERDICT_CONFIG } from '@shared/verdict/verdict-config'
import type { Verdict, VerdictInputs } from '@shared/verdict/verdict-types'
import { EvidenceStrip } from './evidence-strip'

const lower = (key: string) => (isConcernKey(key) ? CONCERNS[key].label.toLowerCase() : key)

// Marker colour per verdict: the saturated verdict colour.
const METER: Record<Exclude<Verdict, 'TOO_EARLY'>, string> = {
  WORKING: 'var(--color-working)',
  NO_VISIBLE_CHANGE: 'var(--color-nochange)',
  CANT_TELL: 'var(--color-canttell)',
  POSSIBLE_IRRITATION: 'var(--color-irritation)',
}

const CONFETTI = ['var(--color-accent)', 'var(--color-accent-2)', 'var(--color-working)', 'var(--color-early-bg)', 'var(--color-canttell-bg)', 'var(--color-ink)', 'var(--color-irritation-bg)', 'var(--color-accent-strong)', 'var(--color-accent-2)', 'var(--color-working)']

const REASON_CHIPS: Record<string, (i: VerdictInputs) => string> = {
  FEW_BASELINE_SCANS: (i) => `${i.baselineCount} of ${VERDICT_CONFIG.minBaselineScans} scans before starting`,
  NOISY_SCANS: (i) => `Photos disagree by about ${formatPoints(i.noise)} points`,
  POOR_QUALITY: () => 'Latest scan was lower quality',
}

type VerdictPanelProps = {
  verdict: Verdict
  reasons: readonly string[]
  inputs: VerdictInputs
  targetConcern: string
  /** Live day count (inputs.daysSinceStart is as of when the verdict was computed). */
  day: number
}

// The verdict, the one number behind it and the signal-vs-noise meter that shows why.
export function VerdictPanel({ verdict, reasons, inputs, targetConcern, day }: VerdictPanelProps) {
  const style = VERDICT_STYLE[verdict]
  const concern = lower(targetConcern)
  const [ref, inView] = useInView<HTMLDivElement>()
  const evidence = describeEvidence(verdict, inputs, day)

  // The measured change in the "better" direction, and the normal variation it is judged against.
  const signal =
    verdict === 'POSSIBLE_IRRITATION' && inputs.worsening
      ? { value: -inputs.worsening.amount, threshold: inputs.worsening.threshold, concern: lower(inputs.worsening.concern) }
      : verdict !== 'TOO_EARLY' && inputs.improvement !== null
        ? { value: inputs.improvement, threshold: inputs.noiseThreshold, concern }
        : null

  const caption: Record<Verdict, string> = {
    WORKING: `The shaded band is normal variation between scans (±${formatPoints(inputs.noiseThreshold)}). Your change is well outside it, so it is real.`,
    NO_VISIBLE_CHANGE: `The shaded band is normal variation between scans (±${formatPoints(inputs.noiseThreshold)}). Your change is inside it, so it does not count as a change yet.`,
    CANT_TELL: `The shaded band is normal variation between scans (±${formatPoints(inputs.noiseThreshold)}). It is too wide to spot a real change.`,
    POSSIBLE_IRRITATION: `Your ${signal?.concern ?? concern} score got worse by more than normal variation (±${formatPoints(signal?.threshold ?? inputs.noiseThreshold)}).`,
    TOO_EARLY: `Skin changes usually take about 4 weeks to show up, and we need at least ${VERDICT_CONFIG.minPostScans} scans after you start.`,
  }

  const left = verdict === 'TOO_EARLY'
  const daysToGo = Math.max(0, VERDICT_CONFIG.minDaysSinceStart - day)
  const scansToGo = Math.max(0, VERDICT_CONFIG.minPostScans - inputs.postCount)

  return (
    <section
      ref={ref}
      className={cn('relative overflow-hidden rounded-(--radius-tile) p-5 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.05fr)] md:items-start md:gap-8 md:p-7', style.tile)}
    >
      {verdict === 'WORKING' && inView && (
        <span aria-hidden className="pointer-events-none absolute top-[156px] right-14 size-0 md:top-32 md:right-auto md:left-[28%]">
          {CONFETTI.map((color, i) => (
            <i
              key={i}
              className="absolute -mt-1 -ml-1 size-2 animate-[burst_1.2s_var(--ease-liquid)_0.9s_both] rounded-[2px]"
              style={{ background: color, '--a': `${i * 36}deg`, '--r': '-44px' } as React.CSSProperties}
            />
          ))}
        </span>
      )}
      <div>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/65 pr-3 pl-2.5 text-[13px] font-extrabold">
          <i className={cn('size-2 rounded-full', style.dot)} />
          {VERDICT_LABELS[verdict]}
        </span>
        <h2 className="display mt-3.5 text-[28px] leading-[1.05] md:text-[32px]">{verdictHeadline(verdict, concern)}</h2>
        {!left && signal && (
          <p className="mt-3 flex flex-wrap items-end gap-x-2.5">
            <CountUp value={signal.value} format={formatSigned} start={inView} className="text-[64px] leading-[0.85] font-extrabold tracking-[-0.05em] tabular-nums md:text-[76px]" />
            <span className="mb-1 text-sm font-bold">{signal.concern} points since you started</span>
          </p>
        )}
      </div>

      <div className="mt-4 md:mt-0 md:pt-14">
        {left ? (
          <div className="flex flex-col gap-4">
            <Progress label="Days since you started" value={day} total={VERDICT_CONFIG.minDaysSinceStart} start={inView} />
            <Progress label="Scans since you started" value={inputs.postCount} total={VERDICT_CONFIG.minPostScans} start={inView} />
          </div>
        ) : (
          signal && <SignalMeter value={signal.value} threshold={signal.threshold} color={METER[verdict as Exclude<Verdict, 'TOO_EARLY'>]} />
        )}
        <p className="mt-3 text-[13.5px] leading-snug">{caption[verdict]}</p>
        {verdict === 'CANT_TELL' && reasons.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {reasons.map((reason) => (
              <li key={reason} className="rounded-full bg-white/65 px-3 py-1.5 text-[13px] font-bold">
                {REASON_CHIPS[reason]?.(inputs) ?? reason}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 md:mt-0">
        {evidence && !left && <EvidenceStrip evidence={evidence} color={METER[verdict as Exclude<Verdict, 'TOO_EARLY'>]} />}
        {left && (
          <div className="rounded-[22px] bg-white/60 p-4 shadow-[inset_0_1px_0_#fff,inset_0_0_0_1px_rgb(255_255_255/0.5)]">
            <h3 className="text-[12.5px] font-extrabold tracking-[0.06em] uppercase">What the verdict waits for</h3>
            <ul className="mt-2.5 flex flex-col gap-1.5 text-[13.5px] leading-snug font-semibold">
              <li>
                {VERDICT_CONFIG.minDaysSinceStart} days since you started: {daysToGo === 0 ? 'done' : `${daysToGo} to go`}
              </li>
              <li>
                {VERDICT_CONFIG.minPostScans} scans since you started: {scansToGo === 0 ? 'done' : `${scansToGo} to go`}
              </li>
            </ul>
            <p className="mt-2 text-[12px] opacity-75">Both are needed before a verdict.</p>
          </div>
        )}
      </div>
    </section>
  )
}

function Progress({ label, value, total, start }: { label: string; value: number; total: number; start: boolean }) {
  const ratio = Math.max(0, Math.min(1, value / total))
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm font-bold">
        <span>{label}</span>
        <span>
          <CountUp value={value} start={start} className="text-[22px] font-extrabold tabular-nums" /> of {total}
        </span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/70 shadow-[inset_0_1px_2px_rgb(14_23_38/0.12)]">
        <div
          className="h-full origin-left rounded-full bg-early"
          style={{ transform: `scaleX(${start ? ratio : 0})`, transition: 'transform 1.2s var(--ease-liquid) .3s' }}
        />
      </div>
    </div>
  )
}
