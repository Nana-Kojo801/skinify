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

// Delete confirmations (product, account). A sheet that springs up on phones, a centred card on wider screens.
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, cancelLabel = 'Cancel', pending, error, onConfirm }: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-black/65 backdrop-blur-[4px] transition-opacity duration-400 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <AlertDialog.Popup className="fixed inset-x-2.5 bottom-2.5 z-50 rounded-[24px] bg-[image:var(--sheen)] bg-tile p-6 pb-7 border border-hair shadow-[0_24px_70px_#0008] transition-[translate,opacity,scale] duration-500 ease-(--ease-spring) data-ending-style:translate-y-[110%] data-starting-style:translate-y-[110%] sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[460px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:data-ending-style:-translate-y-1/2 sm:data-ending-style:scale-90 sm:data-ending-style:opacity-0 sm:data-starting-style:-translate-y-1/2 sm:data-starting-style:scale-90 sm:data-starting-style:opacity-0">
          <span className="mx-auto -mt-2 mb-4 block h-[5px] w-10 rounded-full bg-ink/15 sm:hidden" aria-hidden />
          <span className="grid size-14 place-items-center rounded-[18px] bg-irritation-bg text-irritation-ink">
            <Trash size={26} />
          </span>
          <AlertDialog.Title className="display mt-4 text-3xl leading-none">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-base leading-relaxed text-ink-2">{description}</AlertDialog.Description>
          {error && (
            <p role="alert" className="mt-3 rounded-2xl bg-irritation-bg px-4 py-3 text-sm font-semibold text-irritation-ink">
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
