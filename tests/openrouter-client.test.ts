import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_MODELS, OPENROUTER_URL, parseModelList, requestExplanation } from '../shared/explanation/openrouter-client'

const messages = [{ role: 'user' as const, content: 'hi' }]
const reply = (content: unknown, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status })
const modelOf = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string).model as string

describe('requestExplanation', () => {
  it('returns the model text and sends the key, the first default model and the messages', async () => {
    const fetchFn = vi.fn(async () => reply('Hello there'))
    expect(await requestExplanation({ apiKey: 'k-123', messages, fetchFn })).toBe('Hello there')
    expect(fetchFn).toHaveBeenCalledTimes(1)
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(OPENROUTER_URL)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer k-123')
    expect(JSON.parse(init.body as string)).toMatchObject({ model: DEFAULT_MODELS[0], messages })
  })

  it('never defaults to the free router (it can pick non-chat models)', () => {
    expect((DEFAULT_MODELS as readonly string[]).includes('openrouter/free')).toBe(false)
  })

  it('moves on to the next model when one is rate limited, gone or empty', async () => {
    const answers: Record<string, () => Response> = {
      'a:free': () => reply('x', 429),
      'b:free': () => new Response('{"error":{"message":"not a valid model ID"}}', { status: 400 }),
      'c:free': () => reply('   '),
      'd:free': () => reply('Good answer'),
    }
    const fetchFn = vi.fn(async (_u: unknown, init?: RequestInit) => answers[JSON.parse(init!.body as string).model]())
    const reasons: string[] = []
    const text = await requestExplanation({
      apiKey: 'k', messages, fetchFn: fetchFn as typeof fetch, models: ['a:free', 'b:free', 'c:free', 'd:free'],
      onFailure: (r) => reasons.push(r),
    })
    expect(text).toBe('Good answer')
    expect(fetchFn.mock.calls.map(modelOf)).toEqual(['a:free', 'b:free', 'c:free', 'd:free'])
    expect(reasons).toEqual(['a:free: http_429', 'b:free: http_400', 'c:free: empty_answer'])
  })

  it('stops at the first model that works', async () => {
    const fetchFn = vi.fn(async () => reply('first'))
    await requestExplanation({ apiKey: 'k', messages, fetchFn, models: ['a', 'b'] })
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('returns null when every model fails, with the reasons and without the key', async () => {
    const reasons: string[] = []
    const fetchFn = async () => { throw new Error('offline') }
    expect(await requestExplanation({ apiKey: 'secret-k', messages, fetchFn, models: ['a', 'b'], onFailure: (r) => reasons.push(r) })).toBeNull()
    expect(reasons).toEqual(['a: network_or_unreadable', 'b: network_or_unreadable'])
    expect(reasons.join()).not.toContain('secret-k')
  })

  it('returns null on junk and server errors', async () => {
    expect(await requestExplanation({ apiKey: 'k', messages, models: ['a'], fetchFn: async () => reply('x', 500) })).toBeNull()
    expect(await requestExplanation({ apiKey: 'k', messages, models: ['a'], fetchFn: async () => reply(null) })).toBeNull()
    expect(await requestExplanation({ apiKey: 'k', messages, models: ['a'], fetchFn: async () => new Response('<html>') })).toBeNull()
  })

  it('times out per model and then tries the next one', async () => {
    const reasons: string[] = []
    const fetchFn = (_u: string | URL | Request, init?: RequestInit) => {
      if (JSON.parse(init!.body as string).model === 'slow') {
        return new Promise<Response>((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('aborted'))))
      }
      return Promise.resolve(reply('fast answer'))
    }
    const started = Date.now()
    const text = await requestExplanation({ apiKey: 'k', messages, timeoutMs: 30, models: ['slow', 'quick'], fetchFn: fetchFn as typeof fetch, onFailure: (r) => reasons.push(r) })
    expect(text).toBe('fast answer')
    expect(reasons).toEqual(['slow: timeout'])
    expect(Date.now() - started).toBeLessThan(1000)
  })
})

describe('parseModelList', () => {
  it('splits a comma-separated list and trims it', () => {
    expect(parseModelList(' a:free , b:free,,c ')).toEqual(['a:free', 'b:free', 'c'])
  })
  it('falls back to the defaults when empty or missing', () => {
    expect(parseModelList(undefined)).toEqual(DEFAULT_MODELS)
    expect(parseModelList('  ')).toEqual(DEFAULT_MODELS)
  })
})
