// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'
import schema from '../convex/schema'

const modules = import.meta.glob('../convex/**/*.ts')
const DAY = 86_400_000
const HOUR = 3_600_000

const startOfDay = (ms: number) => Math.floor(ms / DAY) * DAY
/** The product started 40 days ago. */
const START = startOfDay(Date.now() - 40 * DAY)

async function setup() {
  const t = convexTest(schema, modules)
  const userId = await t.run((ctx) => ctx.db.insert('users', { email: 'user@example.com' }))
  const otherId = await t.run((ctx) => ctx.db.insert('users', { email: 'other@example.com' }))
  return { t, userId, otherId, me: t.withIdentity({ subject: `${userId}|s` }) }
}

type TestConvex = Awaited<ReturnType<typeof setup>>['t']

const flat = (acne: number) => ({ acne, redness: 60 })
const noise = { acne: 1, redness: 1 }

/** 2 baseline scans (week before the start and the start day), then post scans after it. */
async function addScans(t: TestConvex, userId: Id<'users'>, acne: number[]) {
  const offsets = [-7 * DAY + HOUR, HOUR, 10 * DAY, 17 * DAY, 24 * DAY, 31 * DAY, 38 * DAY]
  await t.run(async (ctx) => {
    for (const [i, score] of acne.entries()) {
      await ctx.db.insert('scans', { userId, createdAt: START + offsets[i], scores: flat(score), noise, qualityFlag: false })
    }
  })
}

const verdictsOf = (t: TestConvex, productId: Id<'products'>) =>
  t.run((ctx) =>
    ctx.db.query('verdicts').withIndex('by_product_and_createdAt', (q) => q.eq('productId', productId)).order('asc').collect(),
  )

const WORKING_SCORES = [50, 52, 55, 60, 66, 70, 72]

beforeEach(() => {
  vi.stubEnv('OPENROUTER_API_KEY', '') // no explanation calls unless a test turns them on
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('verdict wiring', () => {
  it('a new product gets a first verdict with a templated summary right away', async () => {
    const { t, me } = await setup()
    const productId = await me.mutation(api.products.create, { name: 'Serum', targetConcern: 'acne' })
    const [verdict] = await verdictsOf(t, productId)
    expect(verdict).toMatchObject({ verdict: 'TOO_EARLY', summarySource: 'template', reasons: [] })
    expect(verdict.summary).toContain('Next step:')
    expect(await me.query(api.verdicts.latestForProduct, { productId })).toMatchObject({ verdict: 'TOO_EARLY' })
  })

  it('computes WORKING from scans, and recomputing without changes adds no new row', async () => {
    const { t, me, userId } = await setup()
    const productId = await me.mutation(api.products.create, { name: 'Serum', targetConcern: 'acne', startDate: START })
    await addScans(t, userId, WORKING_SCORES)

    await t.mutation(internal.verdicts.recomputeForUser, { userId })
    const rows = await verdictsOf(t, productId)
    expect(rows.map((r) => r.verdict)).toEqual(['TOO_EARLY', 'WORKING']) // no scans yet at creation
    expect(rows[1].inputs).toMatchObject({ baselineCount: 2, postCount: 5, change: 20 })

    await t.mutation(internal.verdicts.recomputeForUser, { userId })
    await t.mutation(internal.verdicts.recompute, { productId })
    expect(await verdictsOf(t, productId)).toHaveLength(2)
  })

  it('recording a scan recomputes the verdicts of the user\'s products', async () => {
    const { t, me, userId } = await setup()
    const productId = await me.mutation(api.products.create, { name: 'Serum', targetConcern: 'acne', startDate: START })
    await addScans(t, userId, WORKING_SCORES.slice(0, 6)) // 2 baseline + 4 post: last two post scans are 66 and 70

    await t.mutation(internal.scans.recordScan, { userId, scores: flat(72), noise, qualityFlag: false })

    const latest = await me.query(api.verdicts.latestForProduct, { productId })
    expect(latest).toMatchObject({ verdict: 'WORKING', inputs: { postCount: 5, recentPostMean: 71 } })
  })

  it('changing the target concern or start date recomputes; renaming does not', async () => {
    const { t, me, userId } = await setup()
    const productId = await me.mutation(api.products.create, { name: 'Serum', targetConcern: 'acne', startDate: START })
    await addScans(t, userId, WORKING_SCORES)
    await t.mutation(internal.verdicts.recomputeForUser, { userId })
    expect(await verdictsOf(t, productId)).toHaveLength(2)

    await me.mutation(api.products.update, { productId, name: 'Renamed' })
    expect(await verdictsOf(t, productId)).toHaveLength(2)

    await me.mutation(api.products.update, { productId, targetConcern: 'redness' })
    const rows = await verdictsOf(t, productId)
    expect(rows).toHaveLength(3)
    expect(rows[2].inputs.targetConcern).toBe('redness')
    expect(rows[2].verdict).toBe('NO_VISIBLE_CHANGE') // redness stayed at 60

    await me.mutation(api.products.update, { productId, startDate: START + 35 * DAY }) // now barely any post scans
    expect((await verdictsOf(t, productId)).at(-1)!.verdict).toBe('TOO_EARLY')
  })

  it('the daily job recomputes every user\'s products', async () => {
    const { t, me, userId, otherId } = await setup()
    const mine = await me.mutation(api.products.create, { name: 'Mine', targetConcern: 'acne', startDate: START })
    const theirs = await t.run((ctx) =>
      ctx.db.insert('products', { userId: otherId, name: 'Theirs', targetConcern: 'acne', startDate: START }),
    )
    await addScans(t, userId, WORKING_SCORES)
    await addScans(t, otherId, WORKING_SCORES)

    await t.mutation(internal.verdicts.recomputeAll, {})
    expect((await verdictsOf(t, mine)).at(-1)!.verdict).toBe('WORKING')
    expect((await verdictsOf(t, theirs)).at(-1)!.verdict).toBe('WORKING')
    // verdicts never mix users' scans
    expect((await verdictsOf(t, theirs)).at(-1)!.userId).toBe(otherId)
  })
})

describe('explanations (OpenRouter)', () => {
  const GOOD =
    'Your acne score is about 20 points better than before you started, rising from 51 to 71. ' +
    'That gap is well above the roughly 2.8 points of normal variation between scans. ' +
    'This suggests the product may be helping, though other factors matter too. ' +
    'Next step: keep using it as directed and keep scanning weekly to confirm the change holds.'

  async function withWorkingVerdict() {
    const ctx = await setup()
    const productId = await ctx.me.mutation(api.products.create, { name: 'Serum', targetConcern: 'acne', startDate: START })
    await addScans(ctx.t, ctx.userId, WORKING_SCORES)
    await ctx.t.mutation(internal.verdicts.recomputeForUser, { userId: ctx.userId })
    const verdict = (await verdictsOf(ctx.t, productId)).at(-1)!
    return { ...ctx, productId, verdict }
  }
  const modelReplies = (content: string) =>
    vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 }))

  it('replaces the template with the model text and sends only structured numbers', async () => {
    const { t, productId, verdict } = await withWorkingVerdict()
    vi.stubEnv('OPENROUTER_API_KEY', 'or-key-xyz')
    const fetchMock = modelReplies(GOOD)
    vi.stubGlobal('fetch', fetchMock)

    expect(await t.action(internal.explanations.generate, { verdictId: verdict._id })).toBe('model')

    const row = (await verdictsOf(t, productId)).at(-1)!
    expect(row).toMatchObject({ summary: GOOD, summarySource: 'model' })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    const body = JSON.parse(init.body as string)
    expect(body.model).toBe('openrouter/free')
    const sent = JSON.stringify(body)
    expect(sent).not.toContain('user@example.com')
    expect(sent).not.toContain('or-key-xyz')
    expect(body.messages[1].content).toContain('"verdict":"WORKING"')
  })

  it('uses OPENROUTER_MODEL when set', async () => {
    const { t, verdict } = await withWorkingVerdict()
    vi.stubEnv('OPENROUTER_API_KEY', 'k')
    vi.stubEnv('OPENROUTER_MODEL', 'google/gemma-4-31b-it:free')
    const fetchMock = modelReplies(GOOD)
    vi.stubGlobal('fetch', fetchMock)
    await t.action(internal.explanations.generate, { verdictId: verdict._id })
    expect(JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).model).toBe('google/gemma-4-31b-it:free')
  })

  it('keeps the template when the model invents a number', async () => {
    const { t, productId, verdict } = await withWorkingVerdict()
    vi.stubEnv('OPENROUTER_API_KEY', 'k')
    vi.stubGlobal('fetch', modelReplies(GOOD.replace('51 to 71', '51 to 87')))
    expect(await t.action(internal.explanations.generate, { verdictId: verdict._id })).toBe('template')
    expect((await verdictsOf(t, productId)).at(-1)).toMatchObject({ summary: verdict.summary, summarySource: 'template' })
  })

  it('keeps the template when the model diagnoses', async () => {
    const { t, verdict } = await withWorkingVerdict()
    vi.stubEnv('OPENROUTER_API_KEY', 'k')
    vi.stubGlobal('fetch', modelReplies(GOOD.replace('may be helping', 'cleared your eczema')))
    expect(await t.action(internal.explanations.generate, { verdictId: verdict._id })).toBe('template')
  })

  it('keeps the template when OpenRouter errors, is down or times out', async () => {
    const { t, productId, verdict } = await withWorkingVerdict()
    vi.stubEnv('OPENROUTER_API_KEY', 'k')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 503 })))
    expect(await t.action(internal.explanations.generate, { verdictId: verdict._id })).toBe('template')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await t.action(internal.explanations.generate, { verdictId: verdict._id })).toBe('template')
    expect((await verdictsOf(t, productId)).at(-1)).toMatchObject({ summarySource: 'template' })
  })

  it('does nothing without a key, and does not ask twice once a model text is stored', async () => {
    const { t, verdict } = await withWorkingVerdict()
    const fetchMock = modelReplies(GOOD)
    vi.stubGlobal('fetch', fetchMock)
    expect(await t.action(internal.explanations.generate, { verdictId: verdict._id })).toBe('skipped')
    expect(fetchMock).not.toHaveBeenCalled()

    vi.stubEnv('OPENROUTER_API_KEY', 'k')
    expect(await t.action(internal.explanations.generate, { verdictId: verdict._id })).toBe('model')
    expect(await t.action(internal.explanations.generate, { verdictId: verdict._id })).toBe('skipped')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('a new verdict schedules the explanation when a key is set', async () => {
    vi.useFakeTimers()
    try {
      const { t, me } = await setup()
      vi.stubEnv('OPENROUTER_API_KEY', 'k')
      const early =
        'It is too early to judge this product. Skin usually needs about 4 weeks to show changes, and you have no scans after starting yet. ' +
        'Keep scanning about once a week for the next few weeks. Next step: keep using it and scan about once a week.'
      vi.stubGlobal('fetch', modelReplies(early))

      const productId = await me.mutation(api.products.create, { name: 'Serum', targetConcern: 'acne' })
      await t.finishAllScheduledFunctions(vi.runAllTimers)

      expect((await verdictsOf(t, productId))[0]).toMatchObject({ summary: early, summarySource: 'model' })
    } finally {
      vi.useRealTimers()
    }
  })
})
