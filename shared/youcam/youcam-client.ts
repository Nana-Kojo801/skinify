// Minimal YouCam Skin Analysis client: upload -> create task -> poll. Plain fetch, no imports, so it runs
// in Convex actions, in Node (scripts/youcam-live-check.ts) and in tests with a mocked fetch.
// Flow and field names come from docs/youcam-api-notes.md (confirmed against the live API).
// Never put the API key or photo bytes into an error message.
export const YOUCAM_BASE_URL = 'https://yce-api-01.makeupar.com'

/** Image-quality codes from the docs; they come back as task_status "error" with data.error. */
const QUALITY_CODES = new Set([
  'error_below_min_image_size',
  'error_exceed_max_image_size',
  'error_src_face_too_small',
  'error_src_face_out_of_bound',
  'error_lighting_dark',
])

export class YoucamError extends Error {
  /** 'quality': the photo was rejected (retake it). 'api': anything else (our side or YouCam's). */
  kind: 'quality' | 'api'
  /** YouCam's code, e.g. error_lighting_dark, InvalidApiKey, or ours: TIMEOUT, BAD_RESPONSE. */
  code: string

  constructor(kind: 'quality' | 'api', code: string, message: string) {
    super(message)
    this.name = 'YoucamError'
    this.kind = kind
    this.code = code
  }
}

export interface AnalysePhotoOptions {
  apiKey: string
  photo: Uint8Array
  contentType: string
  /** Concern names to request (dst_actions), e.g. ['acne', 'redness']. */
  concerns: readonly string[]
  fileName?: string
  fetchFn?: typeof fetch
  pollIntervalMs?: number
  timeoutMs?: number
}

type Json = Record<string, any>

async function readJson(res: Response): Promise<Json> {
  try {
    return (await res.json()) as Json
  } catch {
    throw new YoucamError('api', `HTTP_${res.status}`, `YouCam returned an unreadable response (HTTP ${res.status}).`)
  }
}

function apiError(res: Response, body: Json): YoucamError {
  const code = typeof body.error_code === 'string' ? body.error_code : `HTTP_${res.status}`
  const message = typeof body.error === 'string' ? body.error : `YouCam request failed (HTTP ${res.status}).`
  return new YoucamError('api', code, message)
}

export interface PhotoAnalysis {
  /** raw_score for each requested concern that came back. */
  scores: Record<string, number>
  /** YouCam's own overall skin score (its `all` output, comes back with any request), or null if it is missing. */
  overall: number | null
}

/** Sends one photo to YouCam and returns the raw_score for each requested concern that came back. */
export async function analysePhoto(options: AnalysePhotoOptions): Promise<Record<string, number>> {
  return (await analysePhotoFull(options)).scores
}

/** Like analysePhoto, plus YouCam's overall score. The overall is display-only: verdicts never use it. */
export async function analysePhotoFull(options: AnalysePhotoOptions): Promise<PhotoAnalysis> {
  const {
    apiKey,
    photo,
    contentType,
    concerns,
    fileName = 'photo.jpg',
    fetchFn = fetch,
    pollIntervalMs = 1000,
    timeoutMs = 60_000,
  } = options
  const json = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }

  // 1. Ask for an upload slot
  const initRes = await fetchFn(`${YOUCAM_BASE_URL}/s2s/v2.0/file`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ files: [{ content_type: contentType, file_name: fileName, file_size: photo.byteLength }] }),
  })
  const init = await readJson(initRes)
  if (!initRes.ok) throw apiError(initRes, init)
  const file = init.data?.files?.[0]
  const put = file?.requests?.[0]
  if (!file?.file_id || !put?.url) throw new YoucamError('api', 'BAD_RESPONSE', 'YouCam did not return an upload URL.')

  // 2. Upload the bytes to the pre-signed URL (Content-Length is set by fetch itself)
  const putHeaders: Record<string, string> = {}
  for (const [name, value] of Object.entries((put.headers ?? {}) as Record<string, string>)) {
    if (name.toLowerCase() !== 'content-length') putHeaders[name] = String(value)
  }
  const putRes = await fetchFn(put.url, { method: put.method ?? 'PUT', headers: putHeaders, body: new Uint8Array(photo) })
  if (!putRes.ok) throw new YoucamError('api', `UPLOAD_${putRes.status}`, `Uploading the photo failed (HTTP ${putRes.status}).`)

  // 3. Create the analysis task
  const taskRes = await fetchFn(`${YOUCAM_BASE_URL}/s2s/v2.0/task/skin-analysis`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ src_file_id: file.file_id, dst_actions: concerns, format: 'json' }),
  })
  const created = await readJson(taskRes)
  if (!taskRes.ok) throw apiError(taskRes, created)
  const taskId = created.data?.task_id
  if (!taskId) throw new YoucamError('api', 'BAD_RESPONSE', 'YouCam did not return a task id.')

  // 4. Poll until the task leaves "running"
  const started = Date.now()
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
    const pollRes = await fetchFn(`${YOUCAM_BASE_URL}/s2s/v2.0/task/skin-analysis/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const poll = await readJson(pollRes)
    if (!pollRes.ok) throw apiError(pollRes, poll)
    const status = poll.data?.task_status

    if (status === 'success') {
      const scores: Record<string, number> = {}
      for (const output of (poll.data?.results?.output ?? []) as Json[]) {
        if (concerns.includes(output.type) && typeof output.raw_score === 'number') {
          scores[output.type] = output.raw_score
        }
      }
      if (Object.keys(scores).length === 0) {
        throw new YoucamError('api', 'BAD_RESPONSE', 'YouCam returned no scores for the requested concerns.')
      }
      const allOutput = ((poll.data?.results?.output ?? []) as Json[]).find((output) => output.type === 'all')
      const overall = typeof allOutput?.score === 'number' && Number.isFinite(allOutput.score) && allOutput.score >= 0 && allOutput.score <= 100 ? allOutput.score : null
      return { scores, overall }
    }
    if (status === 'error') {
      const code = String(poll.data?.error ?? 'unknown_error')
      const message = String(poll.data?.error_message ?? 'The analysis failed.')
      throw new YoucamError(QUALITY_CODES.has(code) ? 'quality' : 'api', code, message)
    }
    if (Date.now() - started > timeoutMs) {
      throw new YoucamError('api', 'TIMEOUT', 'The analysis took too long.')
    }
  }
}
