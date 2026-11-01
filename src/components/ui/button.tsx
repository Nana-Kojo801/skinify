import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Pill buttons. Every interactive size is at least 44 px tall (tap targets). Pressing squishes the button and it
// springs back (transform only).
const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap outline-none select-none transition-[transform,box-shadow,background-color,color] duration-200 ease-(--ease-spring) active:scale-[0.96] active:duration-100 disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-[#17191b] shadow-(--shadow-button) hover:bg-primary-hi',
        accent: 'bg-primary text-[#17191b] hover:bg-primary-hi',
        tint: 'bg-accent text-ink border border-hair',
        soft: 'bg-tile text-ink border border-hair hover:bg-well',
        white: 'bg-[#e9e9e8] text-[#191a1c] hover:bg-white',
        outline: 'border border-hair bg-transparent text-ink hover:bg-well',
        ghost: 'text-ink hover:bg-well',
        glass: 'glass-clear text-white',
        danger: 'bg-transparent text-irritation-ink border border-irritation/35 hover:bg-irritation-bg',
        dangerSolid: 'bg-[#b92321] text-white',

      },
      size: {
        sm: 'h-11 px-4 text-sm',
        md: 'h-12 px-6 text-[15px]',
        lg: 'h-[52px] px-7 text-base',
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
