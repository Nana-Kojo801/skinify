import { CaretLeft } from '@phosphor-icons/react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

/** The white pill that leads back a level. With no label it is a round button with an accessible name. */
export function BackLink({ to, label, ariaLabel, className }: { to: string; label?: string; ariaLabel?: string; className?: string }) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      className={cn(
        'press inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-full bg-[image:var(--sheen)] bg-tile text-base font-semibold text-ink shadow-(--shadow-depth)',
        label ? 'pr-4 pl-2.5' : 'w-11',
        className,
      )}
    >
      <CaretLeft size={18} weight="bold" />
      {label && <span className="max-w-[60vw] truncate">{label}</span>}
    </Link>
  )
}
