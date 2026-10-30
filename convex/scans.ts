import { ConvexError, v } from 'convex/values'
import { CONCERN_KEYS } from '../shared/concerns'
import { DEMO_EMAIL } from '../shared/demo-account'
import { combineOverall, combinePhotoScores, isPoorQuality } from '../shared/scan/combine-scores'
import { cleanBrightness } from '../shared/scan/lighting'
import { SCAN_CONFIG, unitsPerPhoto } from '../shared/scan/scan-config'
import { QUALITY_ERROR_MESSAGES, type ScanErrorData } from '../shared/scan/scan-errors'
import { YoucamError, analysePhotoFull, type PhotoAnalysis } from '../shared/youcam/youcam-client'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { action, internalMutation, internalQuery, query, type QueryCtx } from './_generated/server'
import { getUserId } from './helpers'
import { recomputeUserVerdicts } from './verdictCompute'

const DAY_MS = 86_400_000
const UNITS_COUNTER = 'youcam_units'

function scanError(data: ScanErrorData): ConvexError<ScanErrorData> {
  return new ConvexError(data)
}

async function globalUnitsUsed(ctx: QueryCtx): Promise<number> {
  const counter = await ctx.db.query('usageCounters').withIndex('by_name', (q) => q.eq('name', UNITS_COUNTER)).unique()
  return counter?.value ?? 0
}

/** Scans in the last 24 hours (rolling), oldest first. */
async function scansInLastDay(ctx: QueryCtx, userId: Id<'users'>, now: number): Promise<Doc<'scans'>[]> {
  return await ctx.db
    .query('scans')
    .withIndex('by_user_and_createdAt', (q) => q.eq('userId', userId).gte('createdAt', now - DAY_MS))
    .order('asc')
    .collect()
}

function usageFrom(recent: Doc<'scans'>[]) {
  const dailyLimit = SCAN_CONFIG.dailyScansPerUser
  const usedToday = recent.length
  return {
    usedToday,
    dailyLimit,
    remaining: Math.max(0, dailyLimit - usedToday),
    /** When the next scan becomes available, ms since epoch. null while scans are left. */
    nextScanAt: usedToday >= dailyLimit ? recent[usedToday - dailyLimit].createdAt + DAY_MS : null,
  }
}

/** The signed-in user's scans, oldest first. Empty when signed out. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (userId === null) return []
    return await ctx.db
      .query('scans')
      .withIndex('by_user_and_createdAt', (q) => q.eq('userId', userId))
      .order('asc')
      .collect()
  },
})

/** The newest scan, or null. */
export const latest = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx)
    if (userId === null) return null
    return await ctx.db
      .query('scans')
      .withIndex('by_user_and_createdAt', (q) => q.eq('userId', userId))
      .order('desc')
      .first()
  },
})

/** What the Scan and Home pages need to know before offering a scan. */
export const usage = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const userId = await getUserId(ctx)
    const recent = userId === null ? [] : await scansInLastDay(ctx, userId, now)
    const user = userId === null ? null : await ctx.db.get(userId)
    const isDemoAccount = user?.email === DEMO_EMAIL
    const cost = unitsPerPhoto(CONCERN_KEYS.length) * SCAN_CONFIG.photosPerScan
    const serviceAvailable = (await globalUnitsUsed(ctx)) + cost <= SCAN_CONFIG.globalUnitCap
    const usage = usageFrom(recent)
    return {
      ...usage,
      isDemoAccount,
      serviceAvailable,
      /** false when signed out, on the demo account, at the daily limit, or when the service budget is used up */
      canScan: userId !== null && !isDemoAccount && usage.remaining > 0 && serviceAvailable,
    }
  },
})

// ---- internal functions used by `submit` ----

export const getScanContext = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId)
    return {
      isDemo: user?.email === DEMO_EMAIL,
      usage: usageFrom(await scansInLastDay(ctx, userId, Date.now())),
      globalUnits: await globalUnitsUsed(ctx),
    }
  },
})

export const addUnits = internalMutation({
  args: { units: v.number() },
  handler: async (ctx, { units }) => {
    const counter = await ctx.db.query('usageCounters').withIndex('by_name', (q) => q.eq('name', UNITS_COUNTER)).unique()
    if (counter) await ctx.db.patch(counter._id, { value: counter.value + units })
    else await ctx.db.insert('usageCounters', { name: UNITS_COUNTER, value: units })
  },
})

export const recordScan = internalMutation({
  args: {
    userId: v.id('users'),
    scores: v.record(v.string(), v.number()),
    noise: v.record(v.string(), v.number()),
    qualityFlag: v.boolean(),
    brightness: v.optional(v.number()),
    overall: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const scanId = await ctx.db.insert('scans', { ...args, createdAt: Date.now() })
    // A new scan can change the verdict of every product the user tracks.
    await recomputeUserVerdicts(ctx, args.userId)
    return scanId
  },
})

// ---- the scan itself ----

export interface SubmitResult {
  scanId: Id<'scans'>
  scores: Record<string, number>
  noise: Record<string, number>
  qualityFlag: boolean
}

/**
 * Analyses the two photos of a scan with YouCam and stores the scores (never the photos).
 * Throws ConvexError<ScanErrorData>; the client switches on error.data.code (see shared/scan/scan-errors.ts).
 */
export const submit = action({
  args: {
    photos: v.array(v.object({ data: v.bytes(), contentType: v.string() })),
    /** Average brightness of the photos (0 to 255), measured in the browser, for the "lighting differs" hint. */
    brightness: v.optional(v.number()),
  },
  handler: async (ctx, { photos, brightness }): Promise<SubmitResult> => {
    // Actions can't read the database, so ask an internal query (it runs with the caller's identity).
    const userId = await ctx.runQuery(internal.users.currentUserId, {})
    if (userId === null) throw scanError({ code: 'NOT_AUTHENTICATED', message: 'Please sign in to scan.' })

    // Cheap checks first: nothing below spends YouCam units.
    if (photos.length !== SCAN_CONFIG.photosPerScan) {
      throw scanError({ code: 'INVALID_INPUT', message: `A scan needs exactly ${SCAN_CONFIG.photosPerScan} photos.` })
    }
    for (const photo of photos) {
      if (!SCAN_CONFIG.allowedContentTypes.includes(photo.contentType.toLowerCase())) {
        throw scanError({ code: 'INVALID_INPUT', message: 'Photos must be JPEG or PNG.' })
      }
      if (photo.data.byteLength === 0 || photo.data.byteLength > SCAN_CONFIG.maxPhotoBytes) {
        throw scanError({ code: 'INVALID_INPUT', message: 'A photo was empty or too large. Try again.' })
      }
    }

    const concerns = CONCERN_KEYS
    const perPhoto = unitsPerPhoto(concerns.length)
    const context = await ctx.runQuery(internal.scans.getScanContext, { userId })
    if (context.isDemo) {
      throw scanError({
        code: 'DEMO_ACCOUNT',
        message: 'The demo account runs on sample data. Create your own account to run a real scan.',
      })
    }
    if (context.usage.remaining <= 0) {
      throw scanError({
        code: 'DAILY_LIMIT',
        message: `You can scan ${context.usage.dailyLimit} times in 24 hours. Try again later.`,
        ...(context.usage.nextScanAt !== null && { retryAt: context.usage.nextScanAt }),
      })
    }
    if (context.globalUnits + perPhoto * photos.length > SCAN_CONFIG.globalUnitCap) {
      throw scanError({
        code: 'SERVICE_LIMIT',
        message: 'Live scanning has reached its free limit for this demo. The demo account still works.',
      })
    }

    const apiKey = process.env.YOUCAM_API_KEY
    if (!apiKey) {
      console.error('YOUCAM_API_KEY is not set on this deployment')
      throw scanError({ code: 'API_ERROR', message: 'Scanning is not available right now. Please try again later.' })
    }
    const pollIntervalMs = Number(process.env.YOUCAM_POLL_INTERVAL_MS) || SCAN_CONFIG.pollIntervalMs

    // Both photos in parallel (about 8 s instead of 16 s). YouCam refunds a task that ends in error,
    // so a rejected photo costs nothing; a success next to a failure does cost the successful photo.
    const settled = await Promise.allSettled(
      photos.map((photo, i) =>
        analysePhotoFull({
          apiKey,
          photo: new Uint8Array(photo.data),
          contentType: photo.contentType.toLowerCase(),
          concerns,
          fileName: `photo-${i + 1}.${photo.contentType.toLowerCase() === 'image/png' ? 'png' : 'jpg'}`,
          pollIntervalMs,
          timeoutMs: SCAN_CONFIG.pollTimeoutMs,
        }),
      ),
    )

    const succeeded = settled.filter((r) => r.status === 'fulfilled').length
    if (succeeded > 0) await ctx.runMutation(internal.scans.addUnits, { units: succeeded * perPhoto })

    const failures = settled.flatMap((r, i) => (r.status === 'rejected' ? [{ photo: i + 1, reason: r.reason }] : []))
    if (failures.length > 0) {
      const quality = failures.find((f) => f.reason instanceof YoucamError && f.reason.kind === 'quality')
      if (quality) {
        const code = (quality.reason as YoucamError).code
        throw scanError({
          code: 'LOW_QUALITY_PHOTO',
          message: QUALITY_ERROR_MESSAGES[code] ?? (quality.reason as YoucamError).message,
          photo: quality.photo,
        })
      }
      // Log the code only, never the request or anything that could contain the key or a photo.
      console.error('YouCam analysis failed:', failures.map((f) => (f.reason instanceof YoucamError ? f.reason.code : 'unexpected')))
      throw scanError({
        code: 'API_ERROR',
        message: 'The skin analysis service had a problem. Please try again in a moment.',
      })
    }

    const [first, second] = settled.map((r) => (r as PromiseFulfilledResult<PhotoAnalysis>).value)
    const { scores, noise } = combinePhotoScores(first.scores, second.scores)
    const overall = combineOverall(first.overall, second.overall)
    if (Object.keys(scores).length === 0) {
      throw scanError({ code: 'API_ERROR', message: 'The analysis returned no usable results. Please try again.' })
    }
    const qualityFlag = isPoorQuality(noise, SCAN_CONFIG.poorQualityMeanDiff)
    const scanId = await ctx.runMutation(internal.scans.recordScan, {
      userId,
      scores,
      noise,
      qualityFlag,
      ...(cleanBrightness(brightness) !== null && { brightness: cleanBrightness(brightness)! }),
      ...(overall !== null && { overall }),
    })
    return { scanId, scores, noise, qualityFlag }
  },
})
