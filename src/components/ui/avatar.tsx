import * as React from 'react'
import { cn } from '@/lib/utils'

// Initial-letter avatar. shadcn's Avatar API without the image loader: photos are never stored or shown.
function Avatar({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="avatar"
      className={cn('relative flex size-[33px] shrink-0 overflow-hidden rounded-full border border-[#65666b] bg-[#34363a] select-none', className)}
      {...props}
    />
  )
}

function AvatarFallback({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="avatar-fallback" className={cn('grid size-full place-items-center text-xs text-foreground', className)} {...props} />
}

export { Avatar, AvatarFallback }
