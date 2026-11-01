import { DAY_MS } from '../reminders/reminder-config'
import { RHYTHM_CONFIG } from './rhythm-config'

export type Milestone = {
  id: string
  title: string
  /** e.g. the product it was about. */
  detail?: string
  achieved: boolean
  /** ms since epoch, or null while still to come (or when the date is not tracked, as for streak goals). */
  achievedAt: number | null
  /** For a goal still to come, e.g. "1 to go". */
  progress?: string
}

export type MilestoneInput = {
  /** createdAt of every scan. */
  scanTimes: readonly number[]
  products: readonly { name: string; startDate: number }[]
  /** The first time any product reached WORKING, from the verdict history (null if never). */
  firstWorking: { createdAt: number; productName: string | null } | null
  /** Longest streak ever and the current one, from computeStreak. */
  bestStreak: number
  currentStreak: number
  now: number
}

/** The milestones list: three that come from the person's data, then the next streak goal. */
export function buildMilestones(input: MilestoneInput): Milestone[] {
  const list: Milestone[] = []
  const first = input.scanTimes.length > 0 ? Math.min(...input.scanTimes) : null
  list.push({ id: 'first-scan', title: 'First scan', achieved: first !== null, achievedAt: first })

  list.push({
    id: 'first-working',
    title: 'First "Working" verdict',
    achieved: input.firstWorking !== null,
    achievedAt: input.firstWorking?.createdAt ?? null,
    ...(input.firstWorking?.productName ? { detail: input.firstWorking.productName } : {}),
  })

  const reached = input.products
    .map((product) => ({ name: product.name, at: product.startDate + RHYTHM_CONFIG.productDaysMilestone * DAY_MS }))
    .filter((entry) => entry.at <= input.now)
    .sort((a, b) => a.at - b.at)[0]
  list.push({
    id: 'product-days',
    title: `${RHYTHM_CONFIG.productDaysMilestone} days with a product`,
    achieved: reached !== undefined,
    achievedAt: reached?.at ?? null,
    ...(reached ? { detail: reached.name } : {}),
  })

  // Streak goals: every goal already reached, then the next one still to come.
  const goals = RHYTHM_CONFIG.streakGoals
  const nextIndex = goals.findIndex((goal) => input.bestStreak < goal)
  for (const [index, goal] of goals.entries()) {
    if (nextIndex !== -1 && index > nextIndex) break
    const achieved = input.bestStreak >= goal
    list.push({
      id: `streak-${goal}`,
      title: `${goal} weeks in a row`,
      achieved,
      achievedAt: null, // the date a goal was reached is not tracked, see newMilestones
      ...(achieved ? {} : { progress: `${goal - Math.max(input.currentStreak, 0)} to go` }),
    })
  }
  return list
}

/**
 * Which achieved milestones deserve a celebration now: reached within the last `celebrateWithinDays` days and not
 * seen before. Streak milestones have no stored date, so they are celebrated when the streak reaches the goal
 * exactly (the app remembers what it showed).
 */
export function newMilestones(milestones: readonly Milestone[], seen: ReadonlySet<string>, now: number, currentStreak: number): Milestone[] {
  const cutoff = now - RHYTHM_CONFIG.celebrateWithinDays * DAY_MS
  return milestones.filter((milestone) => {
    if (!milestone.achieved || seen.has(milestone.id)) return false
    if (milestone.id.startsWith('streak-')) return currentStreak === Number(milestone.id.slice('streak-'.length))
    return milestone.achievedAt !== null && milestone.achievedAt >= cutoff
  })
}

/** Plain-words messages for the celebration card. Honest: data from the person's own scans, no promises. */
export function celebrationText(milestone: Milestone): { title: string; text: string } {
  switch (milestone.id) {
    case 'first-scan':
      return { title: 'Your first scan is done', text: 'That is your starting point. Scan weekly and Skinify can tell you honestly what changes.' }
    case 'first-working':
      return {
        title: 'Your first "Working" verdict',
        text: `${milestone.detail ?? 'A product'} moved its score past normal variation. That is real data from your own scans. Keep scanning to see if it holds.`,
      }
    case 'product-days':
      return {
        title: `${RHYTHM_CONFIG.productDaysMilestone} days in`,
        text: `${milestone.detail ?? 'A product'} has now been tracked long enough for a first verdict. Weekly scans keep it up to date.`,
      }
    default:
      return { title: milestone.title, text: 'Steady weekly scans make every verdict more trustworthy.' }
  }
}
