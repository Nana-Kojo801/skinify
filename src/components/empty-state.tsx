import { cn } from '@/lib/utils'

type EmptyStateProps = {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  /** Usually one button or link. */
  action?: React.ReactNode
  /** page: centred, fills the screen (not found, errors, status). section: a bordered block inside a page. */
  variant?: 'page' | 'section'
  heading?: 'h1' | 'h2' | 'h3'
  children?: React.ReactNode
  className?: string
}

// The one empty / not-found / error treatment.
export function EmptyState({ icon, title, description, action, variant = 'section', heading, children, className }: EmptyStateProps) {
  const Heading = heading ?? (variant === 'page' ? 'h1' : 'h2')
  const page = variant === 'page'
  return (
    <section
      className={cn(
        page
          ? 'flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-12 text-center'
          : 'flex flex-col items-start gap-3 rounded-[20px] border border-border p-6 md:p-8',
        className,
      )}
    >
      {icon && (
        <span className={cn('grid shrink-0 place-items-center rounded-2xl border border-border bg-card text-ink-2', page ? 'size-16' : 'size-12')} aria-hidden>
          {icon}
        </span>
      )}
      <Heading className={cn('font-semibold tracking-tight text-balance', page ? 'page-title' : 'text-2xl')}>{title}</Heading>
      {description && <p className={cn('text-ink-2', page ? 'max-w-[38ch] text-base' : 'max-w-[550px] text-sm leading-relaxed')}>{description}</p>}
      {action && <div className={cn('flex flex-wrap gap-2.5', page ? 'mt-2 justify-center' : 'mt-1')}>{action}</div>}
      {children}
    </section>
  )
}
