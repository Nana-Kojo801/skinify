// Sends ONE photo through the same client code the scan backend uses, against the real YouCam API.
// Costs units (12 with the 8 configured concerns). Keep the photo outside the repo.
//   YOUCAM_API_KEY=xxx node scripts/youcam-live-check.ts <photo.jpg>
import { readFile } from 'node:fs/promises'
import { CONCERN_KEYS } from '../shared/concerns.ts'
import { analysePhoto } from '../shared/youcam/youcam-client.ts'

const [path] = process.argv.slice(2)
const apiKey = process.env.YOUCAM_API_KEY
if (!path || !apiKey) {
  console.error('Usage: YOUCAM_API_KEY=xxx node scripts/youcam-live-check.ts <photo.jpg>')
  process.exit(1)
}

const photo = new Uint8Array(await readFile(path))
const started = Date.now()
const scores = await analysePhoto({
  apiKey,
  photo,
  contentType: path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
  concerns: CONCERN_KEYS,
})
console.log(`OK in ${((Date.now() - started) / 1000).toFixed(1)}s, photo ${(photo.byteLength / 1024).toFixed(0)} KB`)
console.log(scores)
