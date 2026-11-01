import * as React from 'react'
import { CaretDownIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// Native <select> in the app's pill style: the phone's own picker, no popup code in the bundle.
function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className={cn('relative w-fit has-[select:disabled]:opacity-50', className)} data-slot="native-select-wrapper">
      <select
        data-slot="native-select"
        className="min-h-11 w-full min-w-0 cursor-pointer appearance-none rounded-full border border-input bg-transparent pr-10 pl-4 text-sm text-ink-2 transition-colors hover:text-foreground disabled:pointer-events-none disabled:cursor-not-allowed"
        {...props}
      />
      <CaretDownIcon className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" data-slot="native-select-icon" />
    </div>
  )
}

function NativeSelectOption({ className, ...props }: React.ComponentProps<'option'>) {
  return <option data-slot="native-select-option" className={cn('bg-popover text-popover-foreground', className)} {...props} />
}

export { NativeSelect, NativeSelectOption }
