import * as React from 'react'
import { cn } from '@/lib/utils'

// Field label that wraps its control (label above, field below).
function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      className={cn('flex flex-col gap-1.5 text-sm font-semibold select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50', className)}
      {...props}
    />
  )
}

export { Label }
