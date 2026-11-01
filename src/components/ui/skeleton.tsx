import { cn } from '@/lib/utils'

// Quiet placeholder with a slow shimmer (switched off for prefers-reduced-motion in index.css).
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white/[.025] after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.5s_ease_infinite] after:bg-linear-to-r after:from-transparent after:via-white/[.035] after:to-transparent',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
