import * as React from 'react'
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Confirmations (delete product, delete account). A sheet that springs up on phones, a centred card on wider screens.
const AlertDialog = AlertDialogPrimitive.Root

function AlertDialogContent({ className, children, ...props }: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop
        data-slot="alert-dialog-overlay"
        className="fixed inset-0 z-40 bg-black/65 backdrop-blur-[4px] transition-opacity duration-400 data-ending-style:opacity-0 data-starting-style:opacity-0"
      />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(
          'fixed inset-x-2.5 bottom-2.5 z-50 rounded-[24px] border border-border bg-card p-6 pb-7 shadow-[0_24px_70px_#0008] transition-[translate,opacity,scale] duration-500 ease-(--ease-spring) data-ending-style:translate-y-[110%] data-starting-style:translate-y-[110%] sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[460px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:data-ending-style:-translate-y-1/2 sm:data-ending-style:scale-90 sm:data-ending-style:opacity-0 sm:data-starting-style:-translate-y-1/2 sm:data-starting-style:scale-90 sm:data-starting-style:opacity-0',
          className,
        )}
        {...props}
      >
        <span className="mx-auto -mt-2 mb-4 block h-[5px] w-10 rounded-full bg-ink/15 sm:hidden" aria-hidden />
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPrimitive.Portal>
  )
}

function AlertDialogMedia({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="alert-dialog-media" className={cn('grid size-14 place-items-center rounded-[18px] bg-irritation-bg text-irritation-ink', className)} {...props} />
}

function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn('display mt-4 text-3xl leading-none', className)} {...props} />
}

function AlertDialogDescription({ className, ...props }: AlertDialogPrimitive.Description.Props) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn('mt-3 text-base leading-relaxed text-ink-2', className)} {...props} />
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-dialog-footer" className={cn('mt-6 flex flex-col gap-2.5 sm:flex-row-reverse sm:*:flex-1', className)} {...props} />
}

function AlertDialogAction({ variant = 'destructiveSolid', size = 'lg', ...props }: React.ComponentProps<typeof Button>) {
  return <Button data-slot="alert-dialog-action" variant={variant} size={size} {...props} />
}

function AlertDialogCancel({ variant = 'secondary', size = 'lg', ...props }: AlertDialogPrimitive.Close.Props & Pick<React.ComponentProps<typeof Button>, 'variant' | 'size'>) {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-cancel" render={<Button variant={variant} size={size} />} {...props} />
}

export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogMedia, AlertDialogTitle }
