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
    <div className={`surface flex flex-col gap-3 p-4 ${problem ? 'border-red-400' : ''}`}>
      <p className="font-medium">{label}</p>
      {previewUrl ? (
        <img src={previewUrl} alt={label} className="aspect-[4/3] w-full rounded-2xl object-cover" />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-input bg-secondary/60 text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Camera size={32} weight="light" />
          <span className="text-sm">Tap to take a photo</span>
        </button>
      )}
      {problem && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {problem}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" disabled={disabled} onClick={() => cameraRef.current?.click()}>
          <Camera size={18} />
          {previewUrl ? 'Retake' : 'Camera'}
        </Button>
        <Button type="button" variant="outline" className="flex-1" disabled={disabled} onClick={() => galleryRef.current?.click()}>
          <Images size={18} />
          Gallery
        </Button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handle} />
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handle} />
    </div>
  )
}
