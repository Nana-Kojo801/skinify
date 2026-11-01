import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// shadcn Toggle API on a plain aria-pressed button (no extra runtime): chips and segmented-control segments.
// At least 44 px tall.
const toggleVariants = cva(
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full border text-sm font-medium whitespace-nowrap text-ink-2 transition-colors duration-200 hover:text-foreground disabled:pointer-events-none disabled:opacity-50 aria-pressed:text-foreground [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-input hover:bg-white/[.03] aria-pressed:border-[#b9b9bb] aria-pressed:bg-white/[.04]',
        segment: 'border-transparent aria-pressed:border-[#d4d4d6] aria-pressed:bg-white/[.03]',
      },
      size: {
        default: 'px-5',
        sm: 'px-3.5',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type ToggleProps = Omit<React.ComponentProps<'button'>, 'onChange'> &
  VariantProps<typeof toggleVariants> & { pressed?: boolean; onPressedChange?: (pressed: boolean) => void }

function Toggle({ className, variant, size, pressed = false, onPressedChange, onClick, type = 'button', ...props }: ToggleProps) {
  return (
    <button
      data-slot="toggle"
      type={type}
      aria-pressed={pressed}
      onClick={(event) => {
        onClick?.(event)
        onPressedChange?.(!pressed)
      }}
      className={cn(toggleVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
