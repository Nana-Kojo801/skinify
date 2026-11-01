import { cn } from '@/lib/utils'

type PageHeaderProps = {
  title?: React.ReactNode
  description?: React.ReactNode
  /** Buttons or links on the right (wrap below the title on phones). */
  actions?: React.ReactNode
  /** Replaces the default <h1> when the title needs a control next to it (Home's chart period). */
  children?: React.ReactNode
  className?: string
}

// The one page header: same title size, spacing and action placement on every screen.
export function PageHeader({ title, description, actions, children, className }: PageHeaderProps) {
  return (
    <header className={cn('screen-heading', className)}>
      <div className="min-w-0">
        {children ?? <h1 className="page-title">{title}</h1>}
        {description && <p>{description}</p>}
      </div>
      {actions}
    </header>
  )
}
