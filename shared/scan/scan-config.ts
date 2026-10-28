// Limits and thresholds for scanning. Tune here.
export const SCAN_CONFIG = {
  /** Photos per scan (spec: 2 back to back). */
  photosPerScan: 2,
  /** Per-user limit on scans in any rolling 24 hours. */
  dailyScansPerUser: 3,
  /**
   * Stop live scans for everyone once the app has spent this many YouCam units.
   * The free allowance is 1,000 in total, so this leaves a margin for dev testing and the spike.
   */
  globalUnitCap: 900,
  /** Per photo. YouCam accepts under 10 MB, but Convex arguments are capped at 16 MiB for the whole call. */
  maxPhotoBytes: 5 * 1024 * 1024,
  allowedContentTypes: ['image/jpeg', 'image/png'],
  /**
   * qualityFlag is set when the two photos of a scan disagree broadly: mean |photo1 - photo2| over all
   * concerns at or above this many points. YouCam gives no quality score on success, so this is OUR guess
   * and needs tuning with real back-to-back photos.
   */
  poorQualityMeanDiff: 10,
  pollIntervalMs: 1000,
  pollTimeoutMs: 60_000,
}

/** YouCam SD pricing per task (docs): 1-4 concerns = 9, 5-8 = 12, 9-12 = 14, 13-16 = 16. */
export function unitsPerPhoto(concernCount: number): number {
  if (concernCount <= 4) return 9
  if (concernCount <= 8) return 12
  if (concernCount <= 12) return 14
  return 16
}
