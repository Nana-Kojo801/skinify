import { v } from 'convex/values'
import { checkExplanation } from '../shared/explanation/explanation-check'
import { buildExplanationMessages } from '../shared/explanation/explanation-prompt'
import { parseModelList, requestExplanation } from '../shared/explanation/openrouter-client'
import { nextStepFor } from '../shared/verdict/verdict-templates'
import { internal } from './_generated/api'
import { internalAction, internalMutation, internalQuery } from './_generated/server'

export const getContext = internalQuery({
  args: { verdictId: v.id('verdicts') },
  handler: async (ctx, { verdictId }) => await ctx.db.get(verdictId),
})

export const save = internalMutation({
  args: { verdictId: v.id('verdicts'), summary: v.string() },
  handler: async (ctx, { verdictId, summary }) => {
    await ctx.db.patch(verdictId, { summary, summarySource: 'model' })
  },
})

/**
 * Asks OpenRouter to explain a verdict in plain language and replaces the templated summary with the answer.
 * The model only ever sees the verdict's numbers (shared/explanation/explanation-prompt.ts). If the call
 * fails, times out, or the text fails the sanity checks, the templated summary simply stays.
 */
export const generate = internalAction({
  args: { verdictId: v.id('verdicts') },
  handler: async (ctx, { verdictId }): Promise<'model' | 'template' | 'skipped'> => {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) return 'skipped'
    const row = await ctx.runQuery(internal.explanations.getContext, { verdictId })
    if (!row || row.summarySource === 'model') return 'skipped'

    const raw = await requestExplanation({
      apiKey,
      models: parseModelList(process.env.OPENROUTER_MODEL),
      messages: buildExplanationMessages(row),
      onFailure: (reason) => console.warn('Explanation: OpenRouter failed:', reason),
    })
    if (raw === null) return 'template'
    const checked = checkExplanation(raw, row, nextStepFor(row))
    if (!checked.ok) {
      console.warn('Explanation rejected:', checked.reason)
      return 'template'
    }
    await ctx.runMutation(internal.explanations.save, { verdictId, summary: checked.text })
    return 'model'
  },
})
