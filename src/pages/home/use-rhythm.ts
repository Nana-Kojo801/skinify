import { buildMilestones, type Milestone } from '@shared/rhythm/milestones'
import { computeStreak, type Streak } from '@shared/rhythm/streak'

type Props = {
  scanTimes: readonly number[]
  products: readonly { name: string; startDate: number }[]
  firstWorking: { createdAt: number; productName: string | null } | null
  now: number
}

/** Streak and milestones, computed once so Home can also feed the celebration. */
export function useRhythm({ scanTimes, products, firstWorking, now }: Props): { streak: Streak; milestones: Milestone[] } {
  const streak = computeStreak(scanTimes, now)
  const milestones = buildMilestones({ scanTimes, products, firstWorking, bestStreak: streak.best, currentStreak: streak.weeks, now })
  return { streak, milestones }
}
