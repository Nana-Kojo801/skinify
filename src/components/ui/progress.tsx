import { Progress as ProgressPrimitive } from '@base-ui/react/progress'
import { cn } from '@/lib/utils'

// Thin bar. Put a ProgressLabel (and optional value) in children; they sit above the bar.
function Progress({ className, children, ...props }: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root data-slot="progress" className={cn('flex flex-wrap gap-3', className)} {...props}>
      {children}
      <ProgressPrimitive.Track data-slot="progress-track" className="relative h-[5px] w-full overflow-hidden rounded-full bg-muted">
        <ProgressPrimitive.Indicator data-slot="progress-indicator" className="h-full rounded-full bg-primary transition-all duration-700 ease-(--ease-liquid)" />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return <ProgressPrimitive.Label data-slot="progress-label" className={cn('text-xs', className)} {...props} />
}

export { Progress, ProgressLabel }
