// Scan quality coach (issue #41, feature 3): hints about the light in the two photos, before a scan is sent.
// Brightness is the average luma of the middle of the photo, 0 (black) to 255 (white), measured in the browser.
// The numbers below are first guesses and need tuning on real photos (like SCAN_CONFIG.poorQualityMeanDiff).
export const LIGHTING_CONFIG = {
  /** Below this a photo "looks quite dark". */
  tooDarkBelow: 70,
  /** Above this a photo "looks very bright". */
  tooBrightAbove: 200,
  /** The two photos of one scan differ by more than this: different light. */
  pairGapAbove: 35,
  /** This scan differs from the previous one by more than this: lighting changed since last time. */
  lastScanGapAbove: 35,
  /** Only the middle of the photo counts (the face), as a fraction of width and height. */
  centreFraction: 0.6,
}

export type LightingLevel = 'ok' | 'dark' | 'bright'

export function lightingLevel(brightness: number): LightingLevel {
  if (brightness < LIGHTING_CONFIG.tooDarkBelow) return 'dark'
  if (brightness > LIGHTING_CONFIG.tooBrightAbove) return 'bright'
  return 'ok'
}

export const LIGHTING_TEXT: Record<LightingLevel, string> = {
  ok: 'Lighting looks good',
  dark: 'Looks quite dark',
  bright: 'Looks very bright',
}

/** Average brightness (Rec. 709 luma) of RGBA pixel data, `stride` = 4 values per pixel. */
export function meanLuma(rgba: ArrayLike<number>): number {
  const pixels = Math.floor(rgba.length / 4)
  if (pixels === 0) return 0
  let sum = 0
  for (let i = 0; i < pixels; i++) {
    const o = i * 4
    sum += 0.2126 * rgba[o] + 0.7152 * rgba[o + 1] + 0.0722 * rgba[o + 2]
  }
  return sum / pixels
}

/** A brightness we accept from the browser, or null (it is only used for hints, so a bad value is just dropped). */
export function cleanBrightness(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 255 ? Math.round(value * 10) / 10 : null
}

export type LightingNote = { id: 'pair' | 'last-scan'; title: string; text: string }

/**
 * What to tell the person about a scan about to be sent. `photos` holds the brightness of each photo (null while
 * not chosen or not measurable); `lastScan` is the brightness stored with their previous scan, if any.
 * Hints only: nothing here ever blocks a scan.
 */
export function coachHints(photos: [number | null, number | null], lastScan: number | null | undefined) {
  const perPhoto = photos.map((b) => (b === null ? null : { level: lightingLevel(b), text: LIGHTING_TEXT[lightingLevel(b)] }))
  const notes: LightingNote[] = []
  const [first, second] = photos
  if (first !== null && second !== null && Math.abs(first - second) > LIGHTING_CONFIG.pairGapAbove) {
    const darker = first < second ? 'Photo 1' : 'Photo 2'
    const lighter = first < second ? 'photo 2' : 'photo 1'
    notes.push({
      id: 'pair',
      title: 'The two photos have different light',
      text: `${darker} is much darker than ${lighter}. The same spot and the same light for both gives steadier scores.`,
    })
  }
  const measured = photos.filter((b): b is number => b !== null)
  const cleanLast = cleanBrightness(lastScan)
  if (measured.length > 0 && cleanLast !== null) {
    const mean = measured.reduce((sum, b) => sum + b, 0) / measured.length
    if (Math.abs(mean - cleanLast) > LIGHTING_CONFIG.lastScanGapAbove) {
      notes.push({
        id: 'last-scan',
        title: 'Lighting differs from your last scan',
        text: `Your last scan was ${cleanLast > mean ? 'brighter' : 'darker'}. The same window at a similar time of day makes changes easier to trust.`,
      })
    }
  }
  return { perPhoto, notes }
}

/** The one number stored with a scan: the mean of its photos' brightness (null if neither could be measured). */
export function scanBrightness(photos: (number | null)[]): number | null {
  const measured = photos.map(cleanBrightness).filter((b): b is number => b !== null)
  return measured.length === 0 ? null : cleanBrightness(measured.reduce((sum, b) => sum + b, 0) / measured.length)
}
