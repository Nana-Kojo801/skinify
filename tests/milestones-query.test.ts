// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'
import { api } from '../convex/_generated/api'
import schema from '../convex/schema'
import { clerkIdFor } from './helpers/clerk-id'

const modules = import.meta.glob('../convex/**/*.ts')
const inputs = {
  targetConcern: 'acne', direction: 'higher', daysSinceStart: 30, daysRemaining: 0, baselineCount: 2, postCount: 4, postScansRemaining: 0,
  baselineMean: 50, recentPostMean: 65, change: 15, improvement: 15, noise: 1, noiseThreshold: 2, noiseRatio: 0.01, flaggedPoorQuality: false, worsening: null,
} as const

async function setup(email: string) {
  const t = convexTest(schema, modules)
  const clerkId = clerkIdFor(email)
  const userId = await t.run((ctx) => ctx.db.insert('users', { email, clerkId }))
  return { t, userId, me: t.withIdentity({ subject: clerkId }) }
}

describe('milestones.firstWorking', () => {
  it('is null when nothing ever reached Working, and when signed out', async () => {
    const { t, userId, me } = await setup('a@gmail.com')
    const productId = await t.run((ctx) => ctx.db.insert('products', { userId, name: 'Serum', targetConcern: 'acne', startDate: 0 }))
    await t.run((ctx) =>
      ctx.db.insert('verdicts', { productId, userId, createdAt: 10, verdict: 'NO_VISIBLE_CHANGE', summary: 's', summarySource: 'template', reasons: [], rescanAdvice: [], inputs }),
    )
    expect(await me.query(api.milestones.firstWorking, {})).toBeNull()
    expect(await t.query(api.milestones.firstWorking, {})).toBeNull()
  })

  it('finds the earliest WORKING verdict with its product name, even if the latest verdict is something else', async () => {
    const { t, userId, me } = await setup('a@gmail.com')
    const product = await t.run((ctx) => ctx.db.insert('products', { userId, name: 'Cleanser', targetConcern: 'acne', startDate: 0 }))
    const verdict = (createdAt: number, v: 'WORKING' | 'CANT_TELL') =>
      t.run((ctx) => ctx.db.insert('verdicts', { productId: product, userId, createdAt, verdict: v, summary: 's', summarySource: 'template', reasons: [], rescanAdvice: [], inputs }))
    await verdict(50, 'WORKING')
    await verdict(20, 'WORKING')
    await verdict(90, 'CANT_TELL')
    expect(await me.query(api.milestones.firstWorking, {})).toEqual({ createdAt: 20, productName: 'Cleanser' })
  })

  it("never looks at another user's verdicts", async () => {
    const mine = await setup('a@gmail.com')
    const other = await mine.t.run((ctx) => ctx.db.insert('users', { email: 'b@gmail.com', clerkId: clerkIdFor('b@gmail.com') }))
    const product = await mine.t.run((ctx) => ctx.db.insert('products', { userId: other, name: 'Theirs', targetConcern: 'acne', startDate: 0 }))
    await mine.t.run((ctx) =>
      ctx.db.insert('verdicts', { productId: product, userId: other, createdAt: 5, verdict: 'WORKING', summary: 's', summarySource: 'template', reasons: [], rescanAdvice: [], inputs }),
    )
    expect(await mine.me.query(api.milestones.firstWorking, {})).toBeNull()
  })

  it('has a null product name when the product is gone', async () => {
    const { t, userId, me } = await setup('a@gmail.com')
    const product = await t.run((ctx) => ctx.db.insert('products', { userId, name: 'Gone', targetConcern: 'acne', startDate: 0 }))
    await t.run((ctx) =>
      ctx.db.insert('verdicts', { productId: product, userId, createdAt: 5, verdict: 'WORKING', summary: 's', summarySource: 'template', reasons: [], rescanAdvice: [], inputs }),
    )
    await t.run((ctx) => ctx.db.delete(product))
    expect(await me.query(api.milestones.firstWorking, {})).toEqual({ createdAt: 5, productName: null })
  })
})
