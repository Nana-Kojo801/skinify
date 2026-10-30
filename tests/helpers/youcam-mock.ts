import { vi } from 'vitest'

/** Photos are told apart by their byte length in the mock. */
export const PHOTO_1_BYTES = 1000
export const PHOTO_2_BYTES = 2000

export type TaskResult = { scores: Record<string, number>; overall?: number } | { error: string; message?: string }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** Replaces global fetch with a fake YouCam. `resultFor(photoBytes)` decides what the analysis returns. */
export function mockYoucam(
  resultFor: (photoBytes: number) => TaskResult,
  options: { initFails?: boolean } = {},
) {
  const calls: { method: string; url: string; headers?: Record<string, string> }[] = []
  const fn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    calls.push({ method, url, headers: init?.headers as Record<string, string> | undefined })

    if (url.endsWith('/s2s/v2.0/file')) {
      if (options.initFails) {
        return json({ status: 401, error: "This API key isn't recognized.", error_code: 'InvalidApiKey' }, 401)
      }
      const size = JSON.parse(init!.body as string).files[0].file_size as number
      return json({
        status: 200,
        data: {
          files: [
            {
              file_id: `f${size}`,
              requests: [
                {
                  method: 'PUT',
                  url: `https://upload.test/${size}`,
                  headers: { 'Content-Length': String(size), 'Content-Type': 'image/jpeg' },
                },
              ],
            },
          ],
        },
      })
    }
    if (url.startsWith('https://upload.test/')) return new Response(null, { status: 200 })
    if (url.endsWith('/task/skin-analysis') && method === 'POST') {
      const body = JSON.parse(init!.body as string)
      return json({ status: 200, data: { task_id: `t-${body.src_file_id}` } })
    }
    if (url.includes('/task/skin-analysis/')) {
      const size = Number(url.split('/t-f')[1])
      const result = resultFor(size)
      if ('error' in result) {
        return json({
          status: 200,
          data: { error: result.error, error_message: result.message ?? 'failed', results: null, task_status: 'error' },
        })
      }
      const output = Object.entries(result.scores).map(([type, raw]) => ({
        type,
        raw_score: raw,
        ui_score: Math.round(raw),
        mask_urls: ['https://masks.test/x.png'],
        url: null,
      }))
      output.push({ type: 'skin_type', skin_type: 'Oily' } as never)
      if (typeof result.overall === 'number') output.push({ type: 'all', score: result.overall, url: null } as never)
      return json({ status: 200, data: { error: null, results: { output }, task_status: 'success' } })
    }
    return json({ status: 404, error: 'unexpected request in test' }, 404)
  })
  vi.stubGlobal('fetch', fn)
  return { fn, calls }
}
