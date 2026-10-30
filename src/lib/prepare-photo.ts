// Every photo is resized with the SAME recipe before upload (docs/api-contract.md): the same face scores up to
// ~5 points differently at different resolutions, which would look like a skin change.
import { LIGHTING_CONFIG, meanLuma } from '@shared/scan/lighting'

const MAX_SIDE = 1200
const JPEG_QUALITY = 0.85

export type PreparedPhoto = {
  blob: Blob
  previewUrl: string
  /** Average brightness of the middle of the photo, 0 to 255 (for the lighting hints), or null if it could not be measured. */
  brightness: number | null
}

/** Mean luma of the middle of the drawn photo, on a small copy so it is instant. Hints only: any failure gives null. */
function measureBrightness(source: HTMLCanvasElement): number | null {
  try {
    const size = 48
    const small = document.createElement('canvas')
    small.width = size
    small.height = size
    const context = small.getContext('2d', { willReadFrequently: true })
    if (!context) return null
    const f = LIGHTING_CONFIG.centreFraction
    context.drawImage(source, (source.width * (1 - f)) / 2, (source.height * (1 - f)) / 2, source.width * f, source.height * f, 0, 0, size, size)
    return Math.round(meanLuma(context.getImageData(0, 0, size, size).data) * 10) / 10
  } catch {
    return null
  }
}

/** Draws the photo on a canvas (this also applies its rotation), longest side 1200 px, JPEG 0.85. Never upscales. */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas is not available')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob) throw new Error('Could not encode the photo')
    // The preview lives only in memory for this page and is revoked when the photo is replaced or the page closes.
    return { blob, previewUrl: URL.createObjectURL(blob), brightness: measureBrightness(canvas) }
  } finally {
    bitmap.close()
  }
}
