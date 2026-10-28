// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, internal } from '../convex/_generated/api'
import schema from '../convex/schema'
import { CONCERN_KEYS } from '../shared/concerns'
import { buildDemoData } from '../shared/demo/demo-data'
import { DEMO_EMAIL } from '../shared/demo-account'
import { computeVerdict } from '../shared/verdict/compute-verdict'

const modules = import.meta.glob('../convex/**/*.ts')
const DAY = 86_400_000

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('buildDemoData', () => {
  const NOW = Date.UTC(2026, 9, 28, 15, 0)

  it('makes 7 weekly scans over 6 weeks and 3 products', () => {
    const { scans, products } = buildDemoData(NOW)
    expect(scans).toHaveLength(7)
    expect(products).toHaveLength(3)
    expect(Math.round((NOW - scans[0].createdAt) / DAY)).toBe(42) // oldest scan is 6 weeks ago
    expect(scans.every((s) => s.createdAt < NOW)).toBe(true)
    expect(scans.map((s) => s.createdAt)).toEqual([...scans.map((s) => s.createdAt)].sort((a, b) => a - b))
  })

  it('is deterministic', () => {
    expect(buildDemoData(NOW)).toEqual(buildDemoData(NOW))
  })

  it('uses only the app\'s concerns, with sensible scores and noise', () => {
    for (const scan of buildDemoData(NOW).scans) {
      expect(Object.keys(scan.scores).sort()).toEqual([...CONCERN_KEYS].sort())
      expect(Object.keys(scan.noise).sort()).toEqual([...CONCERN_KEYS].sort())
      for (const score of Object.values(scan.scores)) {
        expect(score).toBeGreaterThanOrEqual(1)
        expect(score).toBeLessThanOrEqual(100)
      }
    }
    for (const product of buildDemoData(NOW).products) expect(CONCERN_KEYS).toContain(product.targetConcern)
  })

  it('has one flagged scan, in the middle, so the latest scans are clean', () => {
    const flagged = buildDemoData(NOW).scans.map((s) => s.qualityFlag)
    expect(flagged.filter(Boolean)).toHaveLength(1)
    expect(flagged.slice(-2)).toEqual([false, false])
  })

  it('gives WORKING, NO_VISIBLE_CHANGE and CANT_TELL whenever it is seeded (any day, any time of day)', () => {
    const times = [
      Date.UTC(2026, 9, 28, 0, 5), Date.UTC(2026, 9, 28, 8, 29), Date.UTC(2026, 9, 28, 23, 59),
      Date.UTC(2026, 10, 2, 12, 0), Date.UTC(2026, 10, 20, 7, 0), Date.UTC(2027, 0, 1, 0, 0), Date.UTC(2027, 1, 28, 18, 30),
    ]
    for (const now of times) {
      const { scans, products } = buildDemoData(now)
      for (const product of products) {
        const result = computeVerdict({ scans, startDate: product.startDate, targetConcern: product.targetConcern, now })
        expect(result.verdict, `${product.name} seeded at ${new Date(now).toISOString()}`).toBe(product.expected)
      }
    }
  })

  it('the CANT_TELL product fails because of noisy photos, and the WORKING one has no irritation', () => {
    const { scans, products } = buildDemoData(NOW)
    const run = (name: string) => {
      const p = products.find((x) => x.name === name)!
      return computeVerdict({ scans, startDate: p.startDate, targetConcern: p.targetConcern, now: NOW })
    }
    expect(run('Oil-control clay mask').reasons).toEqual(['NOISY_SCANS'])
    expect(run('Salicylic acid cleanser').inputs.worsening).toBeNull()
  })
})

async function setup() {
  const t = convexTest(schema, modules)
  const demoId = await t.run((ctx) => ctx.db.insert('users', { email: DEMO_EMAIL }))
  const otherId = await t.run((ctx) => ctx.db.insert('users', { email: 'other@example.com' }))
  return { t, demoId, otherId, demo: t.withIdentity({ subject: `${demoId}|s` }), other: t.withIdentity({ subject: `${otherId}|s` }) }
}

describe('seedDemoData', () => {
  it('creates 3 products with the intended verdicts and templated explanations', async () => {
    const { t, demoId, demo } = await setup()
    const result = await t.mutation(internal.seed.seedDemoData, { userId: demoId })
    expect(result.scans).toBe(7)
    expect(result.products.map((p) => p.verdict)).toEqual(['WORKING', 'NO_VISIBLE_CHANGE', 'CANT_TELL'])

    const all = await demo.query(api.verdicts.latestForAll, {})
    expect(all).toHaveLength(3)
    for (const { verdict } of all) {
      expect(verdict!.summary).toContain('Next step:')
      expect(verdict!.summarySource).toBe('template')
    }
    expect(await demo.query(api.scans.list, {})).toHaveLength(7)
    const cantTell = all.find((a) => a.verdict!.verdict === 'CANT_TELL')!.verdict!
    expect(cantTell.reasons).toEqual(['NOISY_SCANS'])
    expect(cantTell.rescanAdvice).toHaveLength(1)
  })

  it('can be run again and again with the same result (reset)', async () => {
    const { t, demoId } = await setup()
    await t.mutation(internal.seed.seedDemoData, { userId: demoId })
    await t.mutation(internal.seed.seedDemoData, { userId: demoId })
    const counts = await t.run(async (ctx) => ({
      products: (await ctx.db.query('products').collect()).length,
      scans: (await ctx.db.query('scans').collect()).length,
      verdicts: (await ctx.db.query('verdicts').collect()).length,
    }))
    expect(counts).toEqual({ products: 3, scans: 7, verdicts: 3 })
  })

  it('wipes what was there before, and touches nothing of other users or the counters', async () => {
    const { t, demoId, otherId, other } = await setup()
    const mine = await t.withIdentity({ subject: `${demoId}|s` })
    await t.run(async (ctx) => {
      await ctx.db.insert('products', { userId: demoId, name: 'Vandalism', targetConcern: 'acne', startDate: 0 })
      await ctx.db.insert('scans', { userId: demoId, createdAt: 1, scores: { acne: 1 }, noise: { acne: 1 }, qualityFlag: false })
      await ctx.db.insert('usageCounters', { name: 'youcam_units', value: 77 })
    })
    const theirProduct = await other.mutation(api.products.create, { name: 'Theirs', targetConcern: 'acne' })

    await t.mutation(internal.seed.seedDemoData, { userId: demoId })

    const names = (await mine.query(api.products.list, {})).map((p) => p.name).sort()
    expect(names).toEqual(['Hyaluronic acid moisturiser', 'Oil-control clay mask', 'Salicylic acid cleanser'])
    expect((await mine.query(api.scans.list, {})).some((s) => s.createdAt === 1)).toBe(false)
    expect(await other.query(api.products.get, { productId: theirProduct })).toMatchObject({ name: 'Theirs' })
    expect(await t.run((ctx) => ctx.db.query('verdicts').withIndex('by_user', (q) => q.eq('userId', otherId)).collect())).toHaveLength(1)
    expect(await t.run((ctx) => ctx.db.query('usageCounters').collect())).toMatchObject([{ value: 77 }])
  })

  it('makes no LLM call even when an OpenRouter key is set', async () => {
    const { t, demoId } = await setup()
    vi.stubEnv('OPENROUTER_API_KEY', 'k')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await t.mutation(internal.seed.seedDemoData, { userId: demoId })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('works when seeded at another time (dates are relative to now)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(Date.UTC(2026, 10, 19, 6, 45)))
    const { t, demoId } = await setup()
    const result = await t.mutation(internal.seed.seedDemoData, { userId: demoId })
    expect(result.products.map((p) => p.verdict)).toEqual(['WORKING', 'NO_VISIBLE_CHANGE', 'CANT_TELL'])
  })

  it('findDemoUser finds the demo user by email', async () => {
    const { t, demoId } = await setup()
    expect(await t.query(internal.seed.findDemoUser, {})).toBe(demoId)
    const empty = convexTest(schema, modules)
    expect(await empty.query(internal.seed.findDemoUser, {})).toBeNull()
  })
})

describe('the demo account is read-only', () => {
  it('cannot add, change or delete products', async () => {
    const { t, demoId, demo } = await setup()
    await t.mutation(internal.seed.seedDemoData, { userId: demoId })
    const [first] = await demo.query(api.products.list, {})
    const denied = { data: { code: 'DEMO_ACCOUNT' } }
    await expect(demo.mutation(api.products.create, { name: 'x', targetConcern: 'acne' })).rejects.toMatchObject(denied)
    await expect(demo.mutation(api.products.update, { productId: first._id, name: 'Hacked' })).rejects.toMatchObject(denied)
    await expect(demo.mutation(api.products.remove, { productId: first._id })).rejects.toMatchObject(denied)
    expect(await demo.query(api.products.list, {})).toHaveLength(3)
  })

  it('can read everything, and says so in scans.usage', async () => {
    const { t, demoId, demo } = await setup()
    await t.mutation(internal.seed.seedDemoData, { userId: demoId })
    expect(await demo.query(api.products.list, {})).toHaveLength(3)
    expect(await demo.query(api.scans.usage, {})).toMatchObject({ isDemoAccount: true, canScan: false })
  })

  it('other users are not affected', async () => {
    const { other } = await setup()
    await expect(other.mutation(api.products.create, { name: 'Fine', targetConcern: 'acne' })).resolves.toBeDefined()
  })
})
