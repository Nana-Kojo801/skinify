import * as React from 'react'
import { type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Toggle, toggleVariants } from '@/components/ui/toggle'

// Single-choice group of toggles (shadcn ToggleGroup API: value is an array). Each item is an aria-pressed button
// in a role="group", so every option keeps its own accessible name and Tab order.
type GroupContext = VariantProps<typeof toggleVariants> & { value: readonly string[]; onValueChange?: (value: string[]) => void }
const ToggleGroupContext = React.createContext<GroupContext>({ value: [] })

function ToggleGroup({
  className,
  variant,
  size,
  value,
  onValueChange,
  children,
  ...props
}: Omit<React.ComponentProps<'div'>, 'onChange'> & VariantProps<typeof toggleVariants> & { value: readonly string[]; onValueChange?: (value: string[]) => void }) {
  return (
    <div role="group" data-slot="toggle-group" className={cn('flex items-center gap-2', className)} {...props}>
      <ToggleGroupContext.Provider value={{ variant, size, value, onValueChange }}>{children}</ToggleGroupContext.Provider>
    </div>
  )
}

function ToggleGroupItem({ className, value, ...props }: Omit<React.ComponentProps<typeof Toggle>, 'value' | 'pressed' | 'onPressedChange'> & { value: string }) {
  const context = React.useContext(ToggleGroupContext)
  const pressed = context.value.includes(value)
  return (
    <Toggle
      data-slot="toggle-group-item"
      variant={context.variant}
      size={context.size}
      pressed={pressed}
      onPressedChange={() => {
        if (!pressed) context.onValueChange?.([value])
      }}
      className={cn('shrink-0', className)}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
