// Minimal OpenRouter chat call. Returns the text, or null on ANY failure (HTTP error, timeout, empty or
// unreadable answer): the caller then falls back to the templated summary. Never throws, never logs the key.
import type { ChatMessage } from './explanation-prompt'

export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
/** OpenRouter's own router across whatever free models are available (free model ids change often). */
export const DEFAULT_MODEL = 'openrouter/free'

export interface OpenRouterOptions {
  apiKey: string
  messages: ChatMessage[]
  model?: string
  timeoutMs?: number
  fetchFn?: typeof fetch
}

export async function requestExplanation(options: OpenRouterOptions): Promise<string | null> {
  const { apiKey, messages, model = DEFAULT_MODEL, timeoutMs = 8000, fetchFn = fetch } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchFn(OPENROUTER_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Receipts' },
      body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 600 }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const body = (await res.json()) as { choices?: { message?: { content?: unknown } }[] }
    const content = body.choices?.[0]?.message?.content
    return typeof content === 'string' && content.trim().length > 0 ? content : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
