import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

// Pill buttons. Every interactive size is at least 44 px tall (tap targets). Pressing squishes the button and it
// springs back (transform only).
const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap outline-none select-none transition-[transform,box-shadow,background-color,color] duration-500 ease-(--ease-spring) active:scale-[0.96] active:duration-100 disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-[radial-gradient(120%_120%_at_50%_0%,var(--color-primary-hi)_0%,var(--color-primary)_62%)] text-white shadow-(--shadow-button)',
        accent: 'bg-[image:var(--sheen)] bg-primary text-white shadow-(--shadow-cta)',
        tint: 'bg-[image:var(--sheen)] bg-accent text-ink shadow-(--shadow-depth-color)',
        soft: 'bg-[image:var(--sheen)] bg-tile text-ink shadow-(--shadow-depth)',
        white: 'bg-[image:var(--sheen)] bg-tile text-ink shadow-(--shadow-depth)',
        outline: 'bg-tile text-ink shadow-[inset_0_0_0_1.5px_rgb(14_23_38/0.14)]',
        ghost: 'text-ink hover:bg-well',
        glass: 'glass-clear text-white',
        danger: 'bg-transparent text-irritation-ink shadow-[inset_0_0_0_1.5px_rgb(158_34_22/0.25)] hover:bg-irritation-bg/50',
        dangerSolid: 'bg-[linear-gradient(180deg,#dc3a2c,#b52a1f)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_8px_18px_-8px_rgb(181_42_31/0.65)]',
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
