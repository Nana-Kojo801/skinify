import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Inline notices. No role by default: pass role="alert" for errors, role="status" or role="note" otherwise.
const alertVariants = cva(
  'flex w-full items-start gap-2.5 rounded-2xl border px-4 py-3 text-left text-sm leading-snug [&>svg]:mt-0.5 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-border text-ink-2',
        destructive: 'border-transparent bg-irritation-bg text-irritation-ink',
        warning: 'border-transparent bg-canttell-bg text-canttell-ink',
        tip: 'border-transparent bg-soft text-ink-2',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

function AlertTitle({ className, ...props }: React.ComponentProps<'strong'>) {
  return <strong data-slot="alert-title" className={cn('block font-semibold text-current', className)} {...props} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-description" className={cn('min-w-0', className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription }
