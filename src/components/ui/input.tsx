import * as React from 'react'
import { cn } from '@/lib/utils'

// Pill field, 50 px tall. Text stays 16 px on phones so iOS does not zoom in.
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-[50px] w-full min-w-0 rounded-full border border-input bg-transparent px-4 text-base text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
