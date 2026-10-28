// Errors the scan backend throws (as ConvexError data) and the UI switches on:
//   try { await submit(...) } catch (e) { if (e instanceof ConvexError && isScanErrorData(e.data)) ... }
export const SCAN_ERROR_CODES = [
  'NOT_AUTHENTICATED',
  'DEMO_ACCOUNT',
  'DAILY_LIMIT',
  'SERVICE_LIMIT',
  'INVALID_INPUT',
  'LOW_QUALITY_PHOTO',
  'API_ERROR',
] as const

export type ScanErrorCode = (typeof SCAN_ERROR_CODES)[number]

export type ScanErrorData = {
  code: ScanErrorCode
  /** Human-readable, safe to show to the user. */
  message: string
  /** Which photo (1 or 2) caused LOW_QUALITY_PHOTO, if known. */
  photo?: number
  /** DAILY_LIMIT: ms since epoch when the next scan becomes available. */
  retryAt?: number
}

export function isScanErrorData(value: unknown): value is ScanErrorData {
  if (typeof value !== 'object' || value === null) return false
  const { code, message } = value as Record<string, unknown>
  return (
    typeof message === 'string' &&
    typeof code === 'string' &&
    (SCAN_ERROR_CODES as readonly string[]).includes(code)
  )
}

/** YouCam image-quality error codes (task_status "error") and what to tell the user. */
export const QUALITY_ERROR_MESSAGES: Record<string, string> = {
  error_below_min_image_size: 'The photo is too small. Use the camera at its normal setting and try again.',
  error_exceed_max_image_size: 'The photo is too large. Try again with the camera at its normal setting.',
  error_src_face_too_small: 'Move closer: your face should fill most of the frame.',
  error_src_face_out_of_bound: 'Keep your whole face inside the frame and centred, then retake.',
  error_lighting_dark: 'The photo is too dark. Face a window or turn on a light, then retake.',
}

export function isQualityErrorCode(code: string): boolean {
  return Object.hasOwn(QUALITY_ERROR_MESSAGES, code)
}
