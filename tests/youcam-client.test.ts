import { afterEach, describe, expect, it, vi } from 'vitest'
import { analysePhoto, analysePhotoFull, YoucamError } from '../shared/youcam/youcam-client'
import { mockYoucam, PHOTO_1_BYTES } from './helpers/youcam-mock'

afterEach(() => vi.unstubAllGlobals())

const base = {
  apiKey: 'secret-key-abc',
  photo: new Uint8Array(PHOTO_1_BYTES),
  contentType: 'image/jpeg',
  concerns: ['acne', 'redness'],
  pollIntervalMs: 1,
}

describe('analysePhoto', () => {
  it('uploads, creates a task, polls and returns raw_score for the requested concerns only', async () => {
    const { calls } = mockYoucam(() => ({ scores: { acne: 70.5, redness: 88, pore: 40 } }))
    const scores = await analysePhoto(base)
    expect(scores).toEqual({ acne: 70.5, redness: 88 }) // pore was not requested, skin_type has no raw_score
    expect(calls.map((c) => c.method)).toEqual(['POST', 'PUT', 'POST', 'GET'])
  })

  it('sends the bearer key to YouCam but not to the pre-signed upload URL, and drops Content-Length', async () => {
    const { calls } = mockYoucam(() => ({ scores: { acne: 1, redness: 2 } }))
    await analysePhoto(base)
    const upload = calls.find((c) => c.method === 'PUT')!
    expect(upload.headers).toEqual({ 'Content-Type': 'image/jpeg' })
    expect(calls.filter((c) => c.url.includes('yce-api')).length).toBe(3)
  })

  it('turns a rejected photo into a quality error with the YouCam code', async () => {
    mockYoucam(() => ({ error: 'error_lighting_dark', message: 'too dark' }))
    await expect(analysePhoto(base)).rejects.toMatchObject({ kind: 'quality', code: 'error_lighting_dark' })
  })

  it('treats an unknown task error as an api error', async () => {
    mockYoucam(() => ({ error: 'unknown_internal_error' }))
    await expect(analysePhoto(base)).rejects.toMatchObject({ kind: 'api', code: 'unknown_internal_error' })
  })

  it('reports a bad API key as an api error and never leaks the key', async () => {
    mockYoucam(() => ({ scores: {} }), { initFails: true })
    const error = await analysePhoto(base).catch((e) => e)
    expect(error).toBeInstanceOf(YoucamError)
    expect(error).toMatchObject({ kind: 'api', code: 'InvalidApiKey' })
    expect(`${error.message} ${error.code}`).not.toContain('secret-key-abc')
  })

  it('gives up when the task never finishes', async () => {
    const fn = mockYoucam(() => ({ scores: {} })).fn
    const original = fn.getMockImplementation()!
    fn.mockImplementation(async (input, init) => {
      if (String(input).includes('/task/skin-analysis/')) {
        return new Response(JSON.stringify({ status: 200, data: { task_status: 'running' } }), { status: 200 })
      }
      return original(input, init)
    })
    await expect(analysePhoto({ ...base, timeoutMs: 20 })).rejects.toMatchObject({ code: 'TIMEOUT' })
  })

  it('errors when no requested concern comes back', async () => {
    mockYoucam(() => ({ scores: { pore: 50 } }))
    await expect(analysePhoto(base)).rejects.toMatchObject({ code: 'BAD_RESPONSE' })
  })
})

describe('analysePhotoFull', () => {
  it("returns YouCam's overall score next to the scores, and analysePhoto still returns the scores alone", async () => {
    mockYoucam(() => ({ scores: { acne: 70.5, redness: 88 }, overall: 82 }))
    expect(await analysePhotoFull(base)).toEqual({ scores: { acne: 70.5, redness: 88 }, overall: 82 })
    expect(await analysePhoto(base)).toEqual({ acne: 70.5, redness: 88 })
  })

  it('has a null overall when YouCam sends none', async () => {
    mockYoucam(() => ({ scores: { acne: 70.5 } }))
    expect((await analysePhotoFull(base)).overall).toBeNull()
  })

  it('ignores an overall that is not a sensible 0 to 100 number', async () => {
    mockYoucam(() => ({ scores: { acne: 70.5 }, overall: 250 }))
    expect((await analysePhotoFull(base)).overall).toBeNull()
    mockYoucam(() => ({ scores: { acne: 70.5 }, overall: -3 }))
    expect((await analysePhotoFull(base)).overall).toBeNull()
  })
})
