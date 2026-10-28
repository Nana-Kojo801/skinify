// Milestone 0 spike: send one selfie to the YouCam Skin Analysis API and print the RAW responses.
//
// Usage (needs Node 22.18+ which runs .ts directly):
//   YOUCAM_API_KEY=xxx node scripts/youcam-spike.ts <image.jpg> [--runs 2] [--hd] [--concerns redness,acne]
//
// - Keep the selfie OUTSIDE the repo. Never commit it.
// - Every run costs units (only when the task succeeds). With the default 16 concerns that is
//   16 units per run (SD). Pass --concerns with fewer names to spend less.
// - Raw responses are saved in .spike/ (git-ignored: mask URLs point at your face).
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'

const BASE_URL = 'https://yce-api-01.makeupar.com'

const SD_CONCERNS = [
  'wrinkle', 'droopy_upper_eyelid', 'droopy_lower_eyelid', 'firmness', 'acne', 'moisture',
  'eye_bag', 'dark_circle_v2', 'age_spot', 'radiance', 'redness', 'oiliness', 'pore',
  'texture', 'tear_trough', 'skin_type',
]
const HD_CONCERNS = [
  'hd_redness', 'hd_oiliness', 'hd_age_spot', 'hd_radiance', 'hd_moisture', 'hd_dark_circle',
  'hd_eye_bag', 'hd_droopy_upper_eyelid', 'hd_droopy_lower_eyelid', 'hd_firmness', 'hd_texture',
  'hd_acne', 'hd_pore', 'hd_wrinkle', 'hd_tear_trough', 'hd_skin_type',
]

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 120_000

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(name)
const option = (name: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const imagePath = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
const apiKey = process.env.YOUCAM_API_KEY
const runs = Number(option('--runs') ?? 1)
const hd = flag('--hd')
const concerns = option('--concerns')?.split(',') ?? (hd ? HD_CONCERNS : SD_CONCERNS)

if (!apiKey || !imagePath) {
  console.error('Usage: YOUCAM_API_KEY=xxx node scripts/youcam-spike.ts <image.jpg> [--runs 2] [--hd] [--concerns a,b]')
  process.exit(1)
}

const contentTypes: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }
const contentType = contentTypes[extname(imagePath).toLowerCase()]
if (!contentType) {
  console.error('Image must be .jpg, .jpeg or .png')
  process.exit(1)
}

async function call(label: string, path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  const text = await res.text()
  console.log(`\n=== ${label}: HTTP ${res.status} ===`)
  console.log(text)
  let json: any
  try {
    json = JSON.parse(text)
  } catch {
    json = { _raw: text }
  }
  if (!res.ok) throw Object.assign(new Error(`${label} failed with HTTP ${res.status}`), { body: json })
  return json
}

async function uploadFile(bytes: Buffer): Promise<string> {
  const init = await call('1. init file upload', '/s2s/v2.0/file', {
    method: 'POST',
    body: JSON.stringify({
      files: [{ content_type: contentType, file_name: basename(imagePath!), file_size: bytes.length }],
    }),
  })
  const file = init.data.files[0]
  const put = file.requests[0]
  // fetch sets Content-Length itself from the body; passing it manually is rejected.
  const headers = Object.fromEntries(
    Object.entries(put.headers ?? {}).filter(([k]) => k.toLowerCase() !== 'content-length'),
  ) as Record<string, string>
  const res = await fetch(put.url, { method: put.method ?? 'PUT', headers, body: new Uint8Array(bytes) })
  console.log(`\n=== 2. PUT upload: HTTP ${res.status} ===`)
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`)
  return file.file_id
}

async function analyse(fileId: string) {
  const created = await call('3. create skin-analysis task', '/s2s/v2.0/task/skin-analysis', {
    method: 'POST',
    body: JSON.stringify({ src_file_id: fileId, dst_actions: concerns, format: 'json' }),
  })
  const taskId = created.data.task_id
  const started = Date.now()
  for (;;) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    const status = await call(`4. poll task (${Math.round((Date.now() - started) / 1000)}s)`, `/s2s/v2.0/task/skin-analysis/${taskId}`)
    if (status.data?.task_status !== 'running') return { taskId, status, seconds: (Date.now() - started) / 1000 }
    if (Date.now() - started > POLL_TIMEOUT_MS) throw new Error('Timed out waiting for the task')
  }
}

type Score = { ui_score?: number; raw_score?: number }

const bytes = await readFile(imagePath)
console.log(`Image: ${imagePath} (${(bytes.length / 1024).toFixed(0)} KB), ${hd ? 'HD' : 'SD'}, ${concerns.length} concerns, ${runs} run(s)`)
await mkdir('.spike', { recursive: true })

const results: Record<string, Score>[] = []
for (let run = 1; run <= runs; run++) {
  console.log(`\n################ RUN ${run} of ${runs} ################`)
  const fileId = await uploadFile(bytes)
  const { status, seconds } = await analyse(fileId)
  await writeFile(`.spike/run-${run}.json`, JSON.stringify(status, null, 2))
  const output: any[] = status.data?.results?.output ?? []
  results.push(Object.fromEntries(output.map((o) => [o.type, { ui_score: o.ui_score, raw_score: o.raw_score }])))
  console.log(`\nRun ${run}: task_status=${status.data?.task_status}, ${seconds.toFixed(1)}s, ${output.length} outputs`)
}

console.log('\n################ SUMMARY (raw_score / ui_score per concern) ################')
const types = [...new Set(results.flatMap((r) => Object.keys(r)))]
const rows = types.map((type) => {
  const row: Record<string, unknown> = { concern: type }
  results.forEach((r, i) => {
    row[`raw#${i + 1}`] = r[type]?.raw_score
    row[`ui#${i + 1}`] = r[type]?.ui_score
  })
  if (results.length >= 2) {
    row['|Δraw|'] = Math.abs((results[0][type]?.raw_score ?? NaN) - (results[1][type]?.raw_score ?? NaN))
    row['|Δui|'] = Math.abs((results[0][type]?.ui_score ?? NaN) - (results[1][type]?.ui_score ?? NaN))
  }
  return row
})
console.table(rows)
console.log('Raw responses saved in .spike/ (git-ignored).')
