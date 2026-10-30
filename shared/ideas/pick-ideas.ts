import { isConcernKey, type ConcernKey } from '../concerns'
import { IDEAS, IDEAS_CONFIG, type Idea } from './ideas-config'

export type IdeaBlock = {
  concern: ConcernKey
  score: number
  /** 1 = lowest score among the concerns shown; equal scores share a rank. */
  rank: number
  tied: boolean
  ideas: Idea[]
  note?: string
}

/**
 * The lowest-scoring concerns of a scan, each with its ideas. Nothing is suggested when the scan was flagged as poor
 * quality (the scores can't be trusted), and concerns the person already has an active product for are skipped.
 * "Lowest" only means the smallest number: YouCam's scores for different concerns are not on one common scale.
 */
export function pickIdeaBlocks(input: { scores: Record<string, number>; qualityFlag: boolean; activeConcerns: readonly string[] }): IdeaBlock[] {
  if (input.qualityFlag) return []
  const active = new Set(input.activeConcerns)
  const candidates = Object.entries(input.scores)
    .filter((entry): entry is [ConcernKey, number] => isConcernKey(entry[0]) && Number.isFinite(entry[1]) && !active.has(entry[0]))
    // Lowest first; equal scores keep the order the concerns are declared in (stable and predictable).
    .sort((a, b) => a[1] - b[1])
    .slice(0, IDEAS_CONFIG.maxConcerns)

  return candidates.map(([concern, score]) => {
    // Competition ranking: [42, 44, 44] -> 1, 2, 2.
    const rank = candidates.findIndex(([, other]) => other === score) + 1
    const tied = candidates.filter(([, other]) => other === score).length > 1
    const entry = IDEAS[concern]
    return { concern, score, rank, tied, ideas: entry.ideas.slice(0, IDEAS_CONFIG.maxIdeasPerConcern), note: entry.note }
  })
}

const ORDINAL = ['lowest', '2nd lowest', '3rd lowest']

/** "Lowest score right now", "2nd lowest", "Tied for 2nd lowest". */
export function rankLabel(block: Pick<IdeaBlock, 'rank' | 'tied'>): string {
  const base = ORDINAL[block.rank - 1] ?? `${block.rank}th lowest`
  if (block.rank === 1 && !block.tied) return 'Lowest score right now'
  return block.tied ? `Tied for ${base}` : base.charAt(0).toUpperCase() + base.slice(1)
}
