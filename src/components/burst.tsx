import { Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

const COLORS = ['var(--color-accent)', 'var(--color-accent-2)', 'var(--color-working)', 'var(--color-early-bg)', 'var(--color-canttell-bg)', 'var(--color-ink)', 'var(--color-irritation-bg)', 'var(--color-accent-strong)', 'var(--color-accent-2)', 'var(--color-working)']

/**
 * A small celebration: a round badge that pops in with confetti flying out of it (transform and opacity only).
 * `radius` is how far the confetti travels, in px.
 */
export function Burst({ className, coreClassName, radius = 58, children }: { className?: string; coreClassName?: string; radius?: number; children?: React.ReactNode }) {
  return (
    <div className={cn('relative size-[84px] shrink-0', className)} aria-hidden>
      {COLORS.map((color, i) => (
        <i
          key={i}
          className="absolute top-1/2 left-1/2 -mt-[4.5px] -ml-[4.5px] size-[9px] animate-[burst_1.1s_var(--ease-liquid)_0.25s_both] rounded-[3px]"
          style={{ background: color, '--a': `${i * 36}deg`, '--r': `${-radius}px`, transform: `rotate(${i * 36}deg) translateY(${-radius}px)` } as React.CSSProperties}
        />
      ))}
      <span className={cn('absolute inset-0 grid animate-[pop_.6s_var(--ease-spring)_both] place-items-center rounded-full bg-[image:var(--sheen)] bg-accent text-ink shadow-(--shadow-depth-color)', coreClassName)}>
        {children ?? <Check size={38} weight="bold" />}
      </span>
    </div>
  )
}
