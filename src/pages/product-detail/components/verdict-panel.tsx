import { CountUp } from '@/components/count-up'
import { SignalMeter } from '@/components/signal-meter'
import { useInView } from '@/lib/motion'
import { formatPoints, formatSigned } from '@/lib/format'
import { VERDICT_LABELS, VERDICT_STYLE, verdictHeadline } from '@/lib/verdict-display'
import { cn } from '@/lib/utils'
import { CONCERNS, isConcernKey } from '@shared/concerns'
import { VERDICT_CONFIG } from '@shared/verdict/verdict-config'
import type { Verdict, VerdictInputs } from '@shared/verdict/verdict-types'

const lower = (key: string) => (isConcernKey(key) ? CONCERNS[key].label.toLowerCase() : key)

// Meter colours per verdict: the fill uses the verdict's deep tone, the noise band a mid tint of its pastel.
const METER: Record<Exclude<Verdict, 'TOO_EARLY'>, { fill: string; band: string }> = {
  WORKING: { fill: 'var(--color-working-ink)', band: '#b6d3bf' },
  NO_VISIBLE_CHANGE: { fill: 'var(--color-nochange-ink)', band: '#c5d1e0' },
  CANT_TELL: { fill: 'var(--color-canttell-ink)', band: '#ead09a' },
  POSSIBLE_IRRITATION: { fill: 'var(--color-irritation-ink)', band: '#efbcb5' },
}

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

  return (
    <section ref={ref} className={cn('rounded-(--radius-card) px-5 pt-5.5 pb-5 md:px-7 md:pt-7 md:pb-6', style.panel, style.text, style.depth)}>
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] font-semibold shadow-[0_1px_2px_rgb(46_36_32/0.08)]">
        <i className={cn('size-[7px] rounded-full', style.dot)} />
        {VERDICT_LABELS[verdict]}
      </span>
      <h2 className="mt-3.5 text-[22px] font-semibold tracking-[-0.02em] md:text-[26px]">{verdictHeadline(verdict, concern)}</h2>

      {verdict === 'TOO_EARLY' ? (
        <div className="mt-4 flex flex-col gap-4">
          <Progress label="Days since you started" value={day} total={VERDICT_CONFIG.minDaysSinceStart} start={inView} />
          <Progress label="Scans since you started" value={inputs.postCount} total={VERDICT_CONFIG.minPostScans} start={inView} />
        </div>
      ) : (
        signal && (
          <>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <CountUp value={signal.value} format={formatSigned} start={inView} className="text-[60px] leading-none font-light tracking-[-0.05em] tabular-nums md:text-[72px]" />
              <span className="text-sm font-medium">{signal.concern} points since you started</span>
            </p>
            <div className="mt-4">
              <SignalMeter value={signal.value} threshold={signal.threshold} color={METER[verdict].fill} bandColor={METER[verdict].band} />
            </div>
          </>
        )
      )}

      <p className="mt-3 text-sm leading-relaxed">{caption[verdict]}</p>
      {verdict === 'CANT_TELL' && reasons.length > 0 && (
        <ul className="mt-3.5 flex flex-wrap gap-2">
          {reasons.map((reason) => (
            <li key={reason} className="rounded-full bg-white/80 px-3 py-1.5 text-[13px] font-semibold">
              {REASON_CHIPS[reason]?.(inputs) ?? reason}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Progress({ label, value, total, start }: { label: string; value: number; total: number; start: boolean }) {
  const ratio = Math.max(0, Math.min(1, value / total))
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm font-semibold">
        <span>{label}</span>
        <span>
          <CountUp value={value} start={start} className="text-2xl tabular-nums" /> of {total}
        </span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/75">
        <div
          className="h-full origin-left rounded-full bg-current"
          style={{ transform: `scaleX(${start ? ratio : 0})`, transition: 'transform 1.1s var(--ease-out-soft) .3s' }}
        />
      </div>
    </div>
  )
}
