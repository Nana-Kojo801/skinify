// Minimal OpenRouter chat call. Tries each model in turn and returns the first usable text, or null when
// none works (HTTP error, rate limit, timeout, empty or unreadable answer): the caller then falls back to
// the templated summary. Never throws, never logs the key.
import type { ChatMessage } from './explanation-prompt'

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * Free chat models, in order of preference (checked Oct 28: laguna-s answered in about 4 s; the Gemma ones
 * are good but were rate-limited upstream at the time). Free model ids come and go, so we try them one by
 * one ourselves: OpenRouter rejects a whole request that lists a model id it no longer knows.
 * Do NOT use `openrouter/free`: it can route to non-chat models (it once picked a content-safety classifier).
 * Override with the OPENROUTER_MODEL env var (comma-separated list).
 */
export const DEFAULT_MODELS = [
  'poolside/laguna-s-2.1:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
] as const

export interface OpenRouterOptions {
  apiKey: string
  messages: ChatMessage[]
  /** Models to try in order. Defaults to DEFAULT_MODELS. */
  models?: readonly string[]
  /** Per model. */
  timeoutMs?: number
  fetchFn?: typeof fetch
  /** Called with "<model>: <reason>" for each failed attempt (never the key or the answer): for logs. */
  onFailure?: (reason: string) => void
}

/** "a, b" -> ["a", "b"] (for the OPENROUTER_MODEL env var). Empty or missing gives the defaults. */
export function parseModelList(value: string | undefined): readonly string[] {
  const list = (value ?? '').split(',').map((m) => m.trim()).filter(Boolean)
  return list.length > 0 ? list : DEFAULT_MODELS
}

async function askModel(
  options: OpenRouterOptions & { model: string },
): Promise<{ text: string } | { reason: string }> {
  const { apiKey, messages, model, timeoutMs = 30_000, fetchFn = fetch } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchFn(OPENROUTER_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Receipts' },
      // Room for models that think first.
      body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 1500 }),
      signal: controller.signal,
    })
    if (!res.ok) return { reason: `http_${res.status}` }
    const body = (await res.json()) as { choices?: { message?: { content?: unknown } }[] }
    const content = body.choices?.[0]?.message?.content
    return typeof content === 'string' && content.trim().length > 0 ? { text: content } : { reason: 'empty_answer' }
  } catch {
    return { reason: controller.signal.aborted ? 'timeout' : 'network_or_unreadable' }
  } finally {
    clearTimeout(timer)
  }
}

export async function requestExplanation(options: OpenRouterOptions): Promise<string | null> {
  for (const model of options.models ?? DEFAULT_MODELS) {
    const result = await askModel({ ...options, model })
    if ('text' in result) return result.text
    options.onFailure?.(`${model}: ${result.reason}`)
  }
  return null
}
