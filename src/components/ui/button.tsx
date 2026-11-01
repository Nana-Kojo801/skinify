import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// shadcn button API (variant / size names) with the app's pill look. Every size is at least 44 px tall
// (tap targets). Pressing squishes the button and it springs back (transform only).
const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap select-none transition-[transform,box-shadow,background-color,color] duration-200 ease-(--ease-spring) active:scale-[0.96] active:duration-100 disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-(--shadow-button) hover:bg-primary-hi',
        secondary: 'border border-border bg-card text-foreground hover:bg-secondary',
        outline: 'border border-border bg-transparent text-foreground hover:bg-secondary',
        ghost: 'text-foreground hover:bg-secondary',
        destructive: 'border border-destructive/35 bg-transparent text-irritation-ink hover:bg-irritation-bg',
        destructiveSolid: 'bg-[#b92321] text-white hover:bg-[#a51f1d]',
      },
      size: {
        sm: 'h-11 px-4 text-sm',
        default: 'h-12 px-6 text-base',
        lg: 'h-[52px] px-7 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type ButtonProps = React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>

function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button data-slot="button" type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { Button, buttonVariants }
