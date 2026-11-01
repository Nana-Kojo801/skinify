import { CaretRight } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

/** Account section with flat rows and quiet separators. */
export function SettingsGroup({ title, caption, children, className }: { title?: string; caption?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <section className={cn('settings-group', className)}>
      {title && <h2 className="px-4 pb-2 text-2xs font-semibold tracking-wider text-ink-3 uppercase">{title}</h2>}
      {children && <div className="settings-rows">{children}</div>}
      {caption && <div className="px-4 pt-2 text-xs leading-relaxed text-ink-2">{caption}</div>}
    </section>
  )
}

/** One row: a small tinted icon, a label (and optional second line), and whatever goes on the right. */
export function SettingsRowContent({
  icon,
  tint,
  label,
  sub,
  right = 'chevron',
  danger = false,
}: {
  icon: React.ReactNode
  tint: string
  label: string
  sub?: string
  right?: 'chevron' | 'none' | React.ReactNode
  danger?: boolean
}) {
  return (
    <>
      <span className={cn('settings-icon grid size-[34px] shrink-0 place-items-center', tint)} aria-hidden>
        {icon}
      </span>
      <span className="grid min-w-0 flex-1 gap-px text-left">
        <span className={cn('text-base font-semibold', danger && 'text-irritation-ink')}>{label}</span>
        {sub && <span className="text-xs text-ink-2">{sub}</span>}
      </span>
      {right === 'chevron' ? <CaretRight size={18} weight="bold" className="shrink-0 text-ink-3" aria-hidden /> : right === 'none' ? null : right}
    </>
  )
}

export const rowClass = 'press flex min-h-[62px] w-full cursor-pointer items-center gap-3.5 px-4 py-3 transition-colors hover:bg-white/[.03] disabled:cursor-not-allowed disabled:opacity-45'
