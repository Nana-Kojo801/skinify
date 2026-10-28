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
    <div className={`flex flex-col gap-2 rounded-lg border p-3 ${problem ? 'border-red-400' : ''}`}>
      <p className="text-sm font-medium">{label}</p>
      {previewUrl && <img src={previewUrl} alt={label} className="aspect-[3/4] w-full rounded-md object-cover" />}
      {problem && (
        <p role="alert" className="text-sm text-red-600">
          {problem}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" disabled={disabled} onClick={() => cameraRef.current?.click()}>
          {previewUrl ? 'Retake' : 'Take photo'}
        </Button>
        <Button type="button" variant="outline" className="flex-1" disabled={disabled} onClick={() => galleryRef.current?.click()}>
          From gallery
        </Button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handle} />
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handle} />
    </div>
  )
}
