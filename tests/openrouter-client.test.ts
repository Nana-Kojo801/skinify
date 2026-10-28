import { describe, expect, it, vi } from 'vitest'
import { requestExplanation, DEFAULT_MODEL, OPENROUTER_URL } from '../shared/explanation/openrouter-client'

const messages = [{ role: 'user' as const, content: 'hi' }]
const reply = (content: unknown, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status })

describe('requestExplanation', () => {
  it('returns the model text and sends the key, the default free router and the messages', async () => {
    const fetchFn = vi.fn(async () => reply('Hello there'))
    expect(await requestExplanation({ apiKey: 'k-123', messages, fetchFn })).toBe('Hello there')
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(OPENROUTER_URL)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer k-123')
    expect(JSON.parse(init.body as string)).toMatchObject({ model: DEFAULT_MODEL, messages })
  })

  it('uses a model override', async () => {
    const fetchFn = vi.fn(async () => reply('x'))
    await requestExplanation({ apiKey: 'k', messages, model: 'google/gemma-4-31b-it:free', fetchFn })
    expect(JSON.parse((fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).model).toBe('google/gemma-4-31b-it:free')
  })

  it('returns null on HTTP errors, empty answers, junk and network errors', async () => {
    expect(await requestExplanation({ apiKey: 'k', messages, fetchFn: async () => reply('x', 500) })).toBeNull()
    expect(await requestExplanation({ apiKey: 'k', messages, fetchFn: async () => reply('   ') })).toBeNull()
    expect(await requestExplanation({ apiKey: 'k', messages, fetchFn: async () => reply(null) })).toBeNull()
    expect(await requestExplanation({ apiKey: 'k', messages, fetchFn: async () => new Response('<html>') })).toBeNull()
    expect(await requestExplanation({ apiKey: 'k', messages, fetchFn: async () => { throw new Error('offline') } })).toBeNull()
  })

  it('gives up after the timeout', async () => {
    const hang = (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))))
    const started = Date.now()
    expect(await requestExplanation({ apiKey: 'k', messages, timeoutMs: 30, fetchFn: hang as typeof fetch })).toBeNull()
    expect(Date.now() - started).toBeLessThan(1000)
  })
})
