// Every photo is resized with the SAME recipe before upload (docs/api-contract.md): the same face scores up to
// ~5 points differently at different resolutions, which would look like a skin change.
const MAX_SIDE = 1200
const JPEG_QUALITY = 0.85

export type PreparedPhoto = { blob: Blob; previewUrl: string }

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
    return { blob, previewUrl: URL.createObjectURL(blob) }
  } finally {
    bitmap.close()
  }
}
