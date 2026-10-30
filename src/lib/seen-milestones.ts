// Which milestone celebrations this browser has already shown. Kept in localStorage only (a per-browser
// convenience, never needed for correctness): on another device a celebration may appear once more.
const KEY = 'receipts.seenMilestones'

export function readSeenMilestones(): Set<string> {
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

export function markMilestonesSeen(ids: readonly string[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...new Set([...readSeenMilestones(), ...ids])]))
  } catch {
    // storage unavailable (private window, blocked site data): the celebration may show again, nothing breaks
  }
}
