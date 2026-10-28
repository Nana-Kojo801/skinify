import { ArrowUpRight } from '@phosphor-icons/react'
import { Link } from 'react-router'

// Underlined label followed by a small boxed arrow, the link style of the reference site.
export function ArrowLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2.5 text-sm font-medium">
      <span className="underline underline-offset-4 group-hover:no-underline">{children}</span>
      <span className="flex size-6 items-center justify-center rounded-sm border border-current transition-colors group-hover:bg-white group-hover:text-navy">
        <ArrowUpRight size={14} weight="bold" />
      </span>
    </Link>
  )
}
