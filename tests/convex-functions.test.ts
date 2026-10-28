// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../convex/_generated/api'
import schema from '../convex/schema'
import { DEMO_EMAIL } from '../shared/demo-account'
import { SCAN_CONFIG } from '../shared/scan/scan-config'
import { mockYoucam, PHOTO_1_BYTES, PHOTO_2_BYTES } from './helpers/youcam-mock'

const modules = import.meta.glob('../convex/**/*.ts')
const DAY = 86_400_000

const ALL_CONCERNS = ['acne', 'redness', 'pore', 'texture', 'oiliness', 'moisture', 'radiance', 'dark_circle_v2']
const flat = (value: number) => Object.fromEntries(ALL_CONCERNS.map((c) => [c, value]))

const photo = (bytes: number, contentType = 'image/jpeg') => ({ data: new ArrayBuffer(bytes), contentType })
const goodPhotos = () => [photo(PHOTO_1_BYTES), photo(PHOTO_2_BYTES)]

async function setup(email = 'user@example.com') {
  const t = convexTest(schema, modules)
  const userId = await t.run((ctx) => ctx.db.insert('users', { email }))
  const other = await t.run((ctx) => ctx.db.insert('users', { email: 'other@example.com' }))
  return {
    t,
    userId,
    me: t.withIdentity({ subject: `${userId}|session` }),
    otherUser: t.withIdentity({ subject: `${other}|session` }),
  }
}

beforeEach(() => {
  vi.stubEnv('YOUCAM_API_KEY', 'test-key-123')
  vi.stubEnv('YOUCAM_POLL_INTERVAL_MS', '1')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('products', () => {
  it('creates, lists, gets, updates and removes a product', async () => {
    const { me } = await setup()
    const startDate = Date.UTC(2026, 9, 1)
    const id = await me.mutation(api.products.create, { name: '  Niacinamide 10%  ', targetConcern: 'pore', startDate })

    expect(await me.query(api.products.list, {})).toMatchObject([{ _id: id, name: 'Niacinamide 10%', targetConcern: 'pore', startDate }])
    expect(await me.query(api.products.get, { productId: id })).toMatchObject({ name: 'Niacinamide 10%' })

    await me.mutation(api.products.update, { productId: id, name: 'Serum', endDate: startDate + 30 * DAY })
    expect(await me.query(api.products.get, { productId: id })).toMatchObject({ name: 'Serum', endDate: startDate + 30 * DAY })
    await me.mutation(api.products.update, { productId: id, endDate: null })
    expect((await me.query(api.products.get, { productId: id }))!.endDate).toBeUndefined()

    await me.mutation(api.products.remove, { productId: id })
    expect(await me.query(api.products.list, {})).toEqual([])
  })

  it('defaults the start date to the start of today (UTC)', async () => {
    const { me } = await setup()
    const id = await me.mutation(api.products.create, { name: 'Cleanser', targetConcern: 'acne' })
    const product = await me.query(api.products.get, { productId: id })
    expect(product!.startDate % DAY).toBe(0)
    expect(Date.now() - product!.startDate).toBeLessThan(DAY)
  })

  it('rejects an empty name, a long name and an unknown concern', async () => {
    const { me } = await setup()
    await expect(me.mutation(api.products.create, { name: '   ', targetConcern: 'acne' })).rejects.toMatchObject({ data: { code: 'INVALID_INPUT' } })
    await expect(me.mutation(api.products.create, { name: 'x'.repeat(81), targetConcern: 'acne' })).rejects.toMatchObject({ data: { code: 'INVALID_INPUT' } })
    await expect(me.mutation(api.products.create, { name: 'Ok', targetConcern: 'hd_acne' })).rejects.toMatchObject({ data: { code: 'INVALID_INPUT' } })
  })

  it("keeps users' products apart", async () => {
    const { me, otherUser } = await setup()
    const id = await me.mutation(api.products.create, { name: 'Mine', targetConcern: 'acne' })
    expect(await otherUser.query(api.products.list, {})).toEqual([])
    expect(await otherUser.query(api.products.get, { productId: id })).toBeNull()
    await expect(otherUser.mutation(api.products.update, { productId: id, name: 'Hacked' })).rejects.toMatchObject({ data: { code: 'INVALID_INPUT' } })
    await otherUser.mutation(api.products.remove, { productId: id }) // silently does nothing
    expect(await me.query(api.products.get, { productId: id })).toMatchObject({ name: 'Mine' })
  })

  it('signed-out queries are empty and mutations say NOT_AUTHENTICATED', async () => {
    const { t } = await setup()
    expect(await t.query(api.products.list, {})).toEqual([])
    expect(await t.query(api.scans.list, {})).toEqual([])
    expect(await t.query(api.verdicts.latestForAll, {})).toEqual([])
    await expect(t.mutation(api.products.create, { name: 'x', targetConcern: 'acne' })).rejects.toMatchObject({ data: { code: 'NOT_AUTHENTICATED' } })
  })

  it('removing a product deletes its verdicts', async () => {
    const { t, me, userId } = await setup()
    const id = await me.mutation(api.products.create, { name: 'Mine', targetConcern: 'acne' })
    await t.run((ctx) =>
      ctx.db.insert('verdicts', {
        productId: id,
        userId,
        createdAt: Date.now(),
        verdict: 'TOO_EARLY',
        summary: 's',
        inputs: {
          targetConcern: 'acne', direction: 'higher', daysSinceStart: 1, daysRemaining: 27, baselineCount: 1, postCount: 0,
          postScansRemaining: 3, baselineMean: 60, recentPostMean: null, change: null, improvement: null, noise: 1,
          noiseThreshold: 2, noiseRatio: 0.01, flaggedPoorQuality: false, worsening: null,
        },
      }),
    )
    expect(await me.query(api.verdicts.latestForProduct, { productId: id })).toMatchObject({ verdict: 'TOO_EARLY' })
    expect(await me.query(api.verdicts.latestForAll, {})).toMatchObject([{ productId: id, verdict: { verdict: 'TOO_EARLY' } }])
    await me.mutation(api.products.remove, { productId: id })
    expect(await t.run((ctx) => ctx.db.query('verdicts').collect())).toEqual([])
  })
})

describe('scans.submit', () => {
  it('averages the two photos, stores scores only, and counts the units', async () => {
    const { t, me, userId } = await setup()
    const { calls } = mockYoucam((bytes) => ({ scores: flat(bytes === PHOTO_1_BYTES ? 60 : 70) }))

    const result = await me.action(api.scans.submit, { photos: goodPhotos() })

    expect(result.scores.acne).toBe(65)
    expect(result.noise.acne).toBe(10)
    expect(result.qualityFlag).toBe(true) // mean difference 10 reaches the threshold
    const stored = await t.run((ctx) => ctx.db.query('scans').collect())
    expect(stored).toHaveLength(1)
    // the stored document has exactly these fields: no photo data anywhere
    expect(Object.keys(stored[0]).sort()).toEqual(['_creationTime', '_id', 'createdAt', 'noise', 'qualityFlag', 'scores', 'userId'])
    expect(stored[0].userId).toBe(userId)
    expect(JSON.stringify(stored[0]).length).toBeLessThan(2000)
    // requested only the 8 configured concerns, two photos
    expect(calls.filter((c) => c.url.endsWith('/task/skin-analysis') && c.method === 'POST')).toHaveLength(2)
    // 8 concerns = 12 units per photo, 2 photos
    const counter = await t.run((ctx) => ctx.db.query('usageCounters').collect())
    expect(counter).toMatchObject([{ name: 'youcam_units', value: 24 }])
    expect(await me.query(api.scans.list, {})).toHaveLength(1)
    expect(await me.query(api.scans.latest, {})).toMatchObject({ scores: { acne: 65 } })
  })

  it('similar photos give no quality flag', async () => {
    const { me } = await setup()
    mockYoucam((bytes) => ({ scores: flat(bytes === PHOTO_1_BYTES ? 60 : 62) }))
    expect((await me.action(api.scans.submit, { photos: goodPhotos() })).qualityFlag).toBe(false)
  })

  it('enforces the daily limit before spending anything, and reports when it resets', async () => {
    const { t, me, userId } = await setup()
    const { fn } = mockYoucam(() => ({ scores: flat(60) }))
    const first = Date.now() - 3600_000
    for (let i = 0; i < SCAN_CONFIG.dailyScansPerUser; i++) {
      await t.run((ctx) => ctx.db.insert('scans', { userId, createdAt: first + i, scores: {}, noise: {}, qualityFlag: false }))
    }

    await expect(me.action(api.scans.submit, { photos: goodPhotos() })).rejects.toMatchObject({
      data: { code: 'DAILY_LIMIT', retryAt: first + DAY },
    })
    expect(fn).not.toHaveBeenCalled()
    expect(await me.query(api.scans.usage, {})).toMatchObject({ remaining: 0, canScan: false, nextScanAt: first + DAY })
  })

  it('old scans do not count against the rolling 24 hours', async () => {
    const { t, me, userId } = await setup()
    mockYoucam(() => ({ scores: flat(60) }))
    for (let i = 0; i < 5; i++) {
      await t.run((ctx) => ctx.db.insert('scans', { userId, createdAt: Date.now() - 2 * DAY + i, scores: {}, noise: {}, qualityFlag: false }))
    }
    await expect(me.action(api.scans.submit, { photos: goodPhotos() })).resolves.toBeDefined()
  })

  it('refuses live scans on the demo account', async () => {
    const { me } = await setup(DEMO_EMAIL)
    const { fn } = mockYoucam(() => ({ scores: flat(60) }))
    await expect(me.action(api.scans.submit, { photos: goodPhotos() })).rejects.toMatchObject({ data: { code: 'DEMO_ACCOUNT' } })
    expect(fn).not.toHaveBeenCalled()
    expect(await me.query(api.scans.usage, {})).toMatchObject({ isDemoAccount: true, canScan: false })
  })

  it('stops everyone once the global unit budget is used up', async () => {
    const { t, me } = await setup()
    const { fn } = mockYoucam(() => ({ scores: flat(60) }))
    await t.run((ctx) => ctx.db.insert('usageCounters', { name: 'youcam_units', value: SCAN_CONFIG.globalUnitCap - 23 }))
    await expect(me.action(api.scans.submit, { photos: goodPhotos() })).rejects.toMatchObject({ data: { code: 'SERVICE_LIMIT' } })
    expect(fn).not.toHaveBeenCalled()
    expect(await me.query(api.scans.usage, {})).toMatchObject({ serviceAvailable: false, canScan: false })
  })

  it('maps a rejected photo to LOW_QUALITY_PHOTO, names the photo, stores nothing, and counts only the paid photo', async () => {
    const { t, me } = await setup()
    mockYoucam((bytes) => (bytes === PHOTO_2_BYTES ? { error: 'error_lighting_dark' } : { scores: flat(60) }))

    const error = await me.action(api.scans.submit, { photos: goodPhotos() }).catch((e) => e)
    expect(error.data).toMatchObject({ code: 'LOW_QUALITY_PHOTO', photo: 2 })
    expect(error.data.message).toMatch(/too dark/i)
    expect(await t.run((ctx) => ctx.db.query('scans').collect())).toEqual([])
    expect(await t.run((ctx) => ctx.db.query('usageCounters').collect())).toMatchObject([{ value: 12 }]) // photo 1 was charged
  })

  it('maps YouCam failures to API_ERROR without leaking the key', async () => {
    const { t, me } = await setup()
    mockYoucam(() => ({ scores: {} }), { initFails: true })
    const error = await me.action(api.scans.submit, { photos: goodPhotos() }).catch((e) => e)
    expect(error.data.code).toBe('API_ERROR')
    expect(JSON.stringify(error.data)).not.toContain('test-key-123')
    expect(await t.run((ctx) => ctx.db.query('scans').collect())).toEqual([])
    expect(await t.run((ctx) => ctx.db.query('usageCounters').collect())).toEqual([]) // nothing succeeded, nothing counted
  })

  it('reports a missing API key as API_ERROR', async () => {
    const { me } = await setup()
    vi.stubEnv('YOUCAM_API_KEY', '')
    mockYoucam(() => ({ scores: flat(60) }))
    await expect(me.action(api.scans.submit, { photos: goodPhotos() })).rejects.toMatchObject({ data: { code: 'API_ERROR' } })
  })

  it('validates the photos before doing anything else', async () => {
    const { me } = await setup()
    const { fn } = mockYoucam(() => ({ scores: flat(60) }))
    const invalid = { data: { code: 'INVALID_INPUT' } }
    await expect(me.action(api.scans.submit, { photos: [photo(PHOTO_1_BYTES)] })).rejects.toMatchObject(invalid)
    await expect(me.action(api.scans.submit, { photos: [photo(10, 'image/gif'), photo(10)] })).rejects.toMatchObject(invalid)
    await expect(me.action(api.scans.submit, { photos: [photo(0), photo(10)] })).rejects.toMatchObject(invalid)
    await expect(me.action(api.scans.submit, { photos: [photo(SCAN_CONFIG.maxPhotoBytes + 1), photo(10)] })).rejects.toMatchObject(invalid)
    expect(fn).not.toHaveBeenCalled()
  })

  it('needs a signed-in user', async () => {
    const { t } = await setup()
    const { fn } = mockYoucam(() => ({ scores: flat(60) }))
    await expect(t.action(api.scans.submit, { photos: goodPhotos() })).rejects.toMatchObject({ data: { code: 'NOT_AUTHENTICATED' } })
    expect(fn).not.toHaveBeenCalled()
  })

  it("never shows another user's scans", async () => {
    const { me, otherUser } = await setup()
    mockYoucam(() => ({ scores: flat(60) }))
    await me.action(api.scans.submit, { photos: goodPhotos() })
    expect(await otherUser.query(api.scans.list, {})).toEqual([])
    expect(await otherUser.query(api.scans.latest, {})).toBeNull()
  })
})
