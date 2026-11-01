import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Pill buttons. Every interactive size is at least 44 px tall (tap targets). Pressing squishes the button and it
// springs back (transform only).
const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap outline-none select-none transition-[transform,box-shadow,background-color,color] duration-200 ease-(--ease-spring) active:scale-[0.96] active:duration-100 disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-ink',
        accent: 'bg-[image:var(--sheen)] bg-primary text-white shadow-(--shadow-cta)',
        tint: 'bg-[image:var(--sheen)] bg-accent text-ink shadow-(--shadow-depth-color)',
        soft: 'border border-hair bg-tile text-ink hover:bg-well',
        white: 'bg-[image:var(--sheen)] bg-tile text-ink shadow-(--shadow-depth)',
        outline: 'border border-hair bg-transparent text-ink hover:bg-well',
        ghost: 'text-ink hover:bg-well',
        glass: 'glass-clear text-white',
        danger: 'bg-transparent text-irritation-ink shadow-[inset_0_0_0_1.5px_rgb(158_34_22/0.25)] hover:bg-irritation-bg/50',
        dangerSolid: 'bg-irritation-ink text-white',
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
