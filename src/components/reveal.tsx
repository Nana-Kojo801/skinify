import { useInView } from '@/lib/motion'
import { cn } from '@/lib/utils'

/** Fades and lifts its content in when it scrolls into view. `index` staggers siblings. */
export function Reveal({
  as: Tag = 'div',
  index = 0,
  className,
  children,
}: {
  as?: 'div' | 'section' | 'li' | 'ul'
  index?: number
  className?: string
  children: React.ReactNode
}) {
  const [ref, inView] = useInView<HTMLElement>()
  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-shown={inView}
      className={cn('reveal', className)}
      style={{ '--i': index } as React.CSSProperties}
    >
      {children}
    </Tag>
  )
}
