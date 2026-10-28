import { Camera, Images } from '@phosphor-icons/react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'

type PhotoSlotProps = {
  label: string
  previewUrl: string | null
  disabled: boolean
  problem?: string
  onFile: (file: File) => void
}

// Two hidden file inputs: one opens the front camera (capture="user"), the other the gallery.
export function PhotoSlot({ label, previewUrl, disabled, problem, onFile }: PhotoSlotProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  function handle(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) onFile(file)
  }

  return (
    <div className={`panel flex flex-col gap-4 p-4 ${problem ? 'border-destructive' : ''}`}>
      <p className="font-bold">{label}</p>
      {previewUrl ? (
        <img src={previewUrl} alt={label} className="aspect-[3/4] w-full rounded-md object-cover" />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
          className="flex aspect-[3/4] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed border-white/25 text-white/70 transition-colors hover:border-white/60 hover:text-white"
        >
          <Camera size={36} weight="light" />
          <span className="text-sm">Tap to take a photo</span>
        </button>
      )}
      {problem && (
        <p role="alert" className="text-sm text-destructive">
          {problem}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" disabled={disabled} onClick={() => cameraRef.current?.click()}>
          <Camera size={18} />
          {previewUrl ? 'Retake' : 'Camera'}
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => galleryRef.current?.click()}>
          <Images size={18} />
          Gallery
        </Button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handle} />
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handle} />
    </div>
  )
}
