import { Camera, Check, Images, Warning } from '@phosphor-icons/react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PhotoSlotProps = {
  label: string
  previewUrl: string | null
  disabled: boolean
  problem?: string
  /** Shows the scanning sweep over the photo while the scan is analysed. */
  analysing?: boolean
  onFile: (file: File) => void
}

const corner = 'absolute size-6 border-cocoa/45'

// Two hidden file inputs: one opens the front camera (capture="user"), the other the gallery.
export function PhotoSlot({ label, previewUrl, disabled, problem, analysing = false, onFile }: PhotoSlotProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  function handle(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) onFile(file)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-[15px] font-semibold">{label}</p>
        <p className={cn('text-[13px] font-medium', problem ? 'text-irritation-ink' : 'text-muted')}>{problem ? 'Retake' : previewUrl ? 'Ready' : 'Empty'}</p>
      </div>
      {previewUrl ? (
        <div className={cn('photo relative aspect-[3/4] overflow-hidden rounded-3xl bg-sand', problem && 'ring-[3px] ring-irritation')}>
          <img src={previewUrl} alt={label} className={cn('settle size-full object-cover', problem && 'opacity-60')} />
          {analysing && (
            <>
              <div className="absolute inset-0 bg-cocoa/15" />
              <div className="absolute inset-x-0 top-0 h-1/3 animate-[sweep_2.2s_ease-in-out_infinite_alternate] bg-linear-to-b from-transparent via-white/25 to-white/70">
                <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white shadow-[0_0_18px_4px_rgb(255_255_255/0.8)]" />
              </div>
            </>
          )}
          {!analysing && (
            <span
              className={cn(
                'absolute top-2.5 right-2.5 grid size-8 animate-[pop_.5s_var(--ease-pop)_both] place-items-center rounded-full text-white',
                problem ? 'bg-irritation-ink' : 'bg-working-ink',
              )}
            >
              {problem ? <Warning size={17} weight="bold" /> : <Check size={17} weight="bold" />}
            </span>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
          className="press relative grid aspect-[3/4] w-full cursor-pointer place-items-center overflow-hidden rounded-3xl border-[1.5px] border-dashed border-nude bg-sand text-cocoa-soft shadow-(--shadow-inset) transition-colors hover:bg-nude/60"
        >
          <span aria-hidden className="absolute top-[44%] left-1/2 h-[58%] w-[62%] -translate-x-1/2 -translate-y-1/2 animate-[breathe_3s_ease-in-out_infinite] rounded-[50%] border-2 border-dashed border-cocoa/25" />
          <span aria-hidden className={cn(corner, 'top-3 left-3 rounded-tl-xl border-t-2 border-l-2')} />
          <span aria-hidden className={cn(corner, 'top-3 right-3 rounded-tr-xl border-t-2 border-r-2')} />
          <span aria-hidden className={cn(corner, 'bottom-3 left-3 rounded-bl-xl border-b-2 border-l-2')} />
          <span aria-hidden className={cn(corner, 'right-3 bottom-3 rounded-br-xl border-r-2 border-b-2')} />
          <span className="absolute inset-x-0 bottom-5 flex flex-col items-center gap-1 text-[13px] font-semibold">
            <Camera size={24} />
            Tap to take a photo
          </span>
        </button>
      )}
      {problem && (
        <p role="alert" className="px-1 text-[13px] leading-snug text-irritation-ink">
          {problem}
        </p>
      )}
      {!analysing && (
        <div className="grid grid-cols-2 gap-1.5">
          <Button variant="soft" size="sm" className="px-2" disabled={disabled} onClick={() => cameraRef.current?.click()}>
            <Camera size={17} />
            {previewUrl ? 'Retake' : 'Camera'}
          </Button>
          <Button variant="soft" size="sm" className="px-2" disabled={disabled} onClick={() => galleryRef.current?.click()}>
            <Images size={17} />
            Gallery
          </Button>
        </div>
      )}
      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handle} />
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handle} />
    </div>
  )
}
