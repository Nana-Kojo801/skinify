import { concernLabel, nextStepFor, type VerdictText } from '../verdict/verdict-templates'

export interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

const SYSTEM_PROMPT = `You explain the result of a skincare tracking app in plain, calm language.
You are given ONLY numbers computed by the app, as JSON. Scores run from 1 to 100 and higher means healthier skin.

Write exactly 3 or 4 short sentences about what the result means, then ONE final sentence that starts with "Next step:" and rephrases the "suggestedNextStep" you were given.

Rules:
- Use only the numbers in the JSON. Never invent, estimate or change a number or score.
- Never diagnose, never name a skin condition, never recommend medication or ingredients.
- Do not claim the product definitely works or does not work; results come from photos and are estimates.
- No markdown, no lists, no emojis. Plain text only.`

/** The only data that ever leaves the app for the LLM: numbers and enums, no photos, no user details. */
export function buildExplanationInput(row: VerdictText) {
  const i = row.inputs
  return {
    verdict: row.verdict,
    concern: concernLabel(i.targetConcern),
    daysSinceStart: i.daysSinceStart,
    scansBeforeStart: i.baselineCount,
    scansAfterStart: i.postCount,
    scoreBeforeStart: i.baselineMean,
    recentScore: i.recentPostMean,
    changeInScore: i.change,
    improvement: i.improvement,
    normalVariation: i.noiseThreshold,
    problems: row.reasons,
    worsening: i.worsening
      ? { concern: concernLabel(i.worsening.concern), amount: i.worsening.amount, normalVariation: i.worsening.threshold }
      : null,
    suggestedNextStep: nextStepFor(row),
  }
}

export function buildExplanationMessages(row: VerdictText): ChatMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `Explain this result:\n${JSON.stringify(buildExplanationInput(row))}` },
  ]
}
