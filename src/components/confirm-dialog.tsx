import { AlertDialog } from '@base-ui/react/alert-dialog'
import { Trash } from '@phosphor-icons/react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  pending?: boolean
  error?: string | null
  onConfirm: () => void
}

// Delete confirmations (product, account). Bottom sheet on phones, centred card on wider screens.
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, cancelLabel = 'Cancel', pending, error, onConfirm }: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-cocoa/40 transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <AlertDialog.Popup className="fixed inset-x-3 bottom-3 z-50 rounded-[30px] bg-card p-6 shadow-(--shadow-float) transition-[translate,opacity] duration-300 ease-(--ease-out-soft) data-ending-style:translate-y-6 data-ending-style:opacity-0 data-starting-style:translate-y-6 data-starting-style:opacity-0 sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[440px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:data-ending-style:-translate-y-[45%] sm:data-starting-style:-translate-y-[45%]">
          <span className="grid size-14 place-items-center rounded-full bg-irritation-bg text-irritation-ink">
            <Trash size={26} />
          </span>
          <AlertDialog.Title className="mt-4 text-2xl font-semibold tracking-[-0.02em]">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-[15px] leading-relaxed text-muted">{description}</AlertDialog.Description>
          {error && (
            <p role="alert" className="mt-3 rounded-2xl bg-irritation-bg px-4 py-3 text-sm text-irritation-ink">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row-reverse">
            <button type="button" onClick={onConfirm} disabled={pending} className={cn(buttonVariants({ variant: 'dangerSolid', size: 'lg' }), 'sm:flex-1')}>
              {pending ? 'Deleting…' : confirmLabel}
            </button>
            <AlertDialog.Close disabled={pending} className={cn(buttonVariants({ variant: 'soft', size: 'lg' }), 'sm:flex-1')}>
              {cancelLabel}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
