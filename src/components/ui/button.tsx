import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Pill buttons. Every interactive size is at least 44 px tall (tap targets).
const buttonVariants = cva(
  'press inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap outline-none select-none transition-colors disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-cocoa text-cream hover:bg-cocoa-soft',
        soft: 'bg-sand text-cocoa hover:bg-nude',
        white: 'bg-card text-cocoa shadow-(--shadow-card) hover:bg-cream',
        outline: 'border-[1.5px] border-nude bg-card text-cocoa hover:border-cocoa/40',
        ghost: 'text-cocoa hover:bg-sand',
        danger: 'bg-irritation-bg text-irritation-ink hover:bg-[#f2cbc5]',
        dangerSolid: 'bg-irritation-ink text-white hover:bg-[#862626]',
      },
      size: {
        sm: 'h-11 px-4 text-sm',
        md: 'h-12 px-6 text-[15px]',
        lg: 'h-14 px-7 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>

function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { Button, buttonVariants }
