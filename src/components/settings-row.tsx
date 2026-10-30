import { CaretRight } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

/** iOS-style grouped list: a white rounded group of rows with inset hairlines. */
export function SettingsGroup({ title, caption, children, className }: { title?: string; caption?: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      {title && <h2 className="px-4 pb-2 text-[12.5px] font-extrabold tracking-[0.06em] text-ink-3 uppercase">{title}</h2>}
      {children && <div className="tile overflow-hidden rounded-[22px] [&>*+*]:shadow-[inset_64px_1px_0_var(--color-tile),inset_0_1px_0_var(--color-hair)]">{children}</div>}
      {caption && <div className="px-4 pt-2 text-[13px] leading-relaxed text-ink-2">{caption}</div>}
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
      <span className={cn('grid size-[34px] shrink-0 place-items-center rounded-[10px] shadow-[inset_0_1px_0_rgb(255_255_255/0.6)]', tint)} aria-hidden>
        {icon}
      </span>
      <span className="grid min-w-0 flex-1 gap-px text-left">
        <span className={cn('text-base font-bold', danger && 'text-irritation-ink')}>{label}</span>
        {sub && <span className="text-[13px] text-ink-2">{sub}</span>}
      </span>
      {right === 'chevron' ? <CaretRight size={18} weight="bold" className="shrink-0 text-ink-3" aria-hidden /> : right === 'none' ? null : right}
    </>
  )
}

export const rowClass = 'press flex min-h-[62px] w-full cursor-pointer items-center gap-3.5 px-4 py-3 disabled:cursor-not-allowed disabled:opacity-45'
