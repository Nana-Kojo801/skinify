import { ArrowLeft, CheckCircle } from '@phosphor-icons/react'
import { useAction, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { preparePhoto, type PreparedPhoto } from '@/lib/prepare-photo'
import { isScanErrorData } from '@shared/scan/scan-errors'
import { api } from '../../../convex/_generated/api'
import { PhotoSlot } from './components/photo-slot'
import { ScanResult, type ScanResultData } from './components/scan-result'

type Slot = PreparedPhoto | null

export function ScanPage() {
  const usage = useQuery(api.scans.usage)
  const submit = useAction(api.scans.submit)
  const [photos, setPhotos] = useState<[Slot, Slot]>([null, null])
  const [problems, setProblems] = useState<[string?, string?]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<ScanResultData | null>(null)
  const photosRef = useRef(photos)

  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  // Free the in-memory previews when leaving the page.
  useEffect(() => () => photosRef.current.forEach((photo) => photo && URL.revokeObjectURL(photo.previewUrl)), [])

  async function onFile(index: 0 | 1, file: File) {
    setError(null)
    setProblems((prev) => (index === 0 ? [undefined, prev[1]] : [prev[0], undefined]))
    try {
      const prepared = await preparePhoto(file)
      setPhotos((prev) => {
        const old = prev[index]
        if (old) URL.revokeObjectURL(old.previewUrl)
        const next: [Slot, Slot] = [prev[0], prev[1]]
        next[index] = prepared
        return next
      })
    } catch {
      setError('That file could not be read as a photo. Try another one.')
    }
  }

  async function onSubmit() {
    if (!photos[0] || !photos[1]) return
    setError(null)
    setProblems([])
    setPending(true)
    try {
      const payload = await Promise.all(
        [photos[0], photos[1]].map(async (photo) => ({ data: await photo.blob.arrayBuffer(), contentType: photo.blob.type })),
      )
      const scan = await submit({ photos: payload })
      photos.forEach((photo) => photo && URL.revokeObjectURL(photo.previewUrl))
      setPhotos([null, null])
      setResult({ scores: scan.scores, qualityFlag: scan.qualityFlag })
    } catch (e) {
      if (e instanceof ConvexError && isScanErrorData(e.data)) {
        if (e.data.code === 'LOW_QUALITY_PHOTO' && (e.data.photo === 1 || e.data.photo === 2)) {
          setProblems(e.data.photo === 1 ? [e.data.message, undefined] : [undefined, e.data.message])
          setError('Retake the photo marked below.')
        } else if (e.data.code === 'DAILY_LIMIT' && e.data.retryAt) {
          setError(`${e.data.message} Next scan: ${formatDateTime(e.data.retryAt)}.`)
        } else if (e.data.code === 'NOT_AUTHENTICATED') {
          setError('You were signed out. Sign in again.')
        } else {
          setError(e.data.message)
        }
      } else {
        setError('Could not reach the server. Check your connection and try again.')
      }
    } finally {
      setPending(false)
    }
  }

  if (result) {
    return (
      <main className="mx-auto max-w-md px-5 pt-4 pb-12">
        <ScanResult result={result} />
      </main>
    )
  }

  const blocked =
    usage !== undefined && !usage.canScan
      ? usage.isDemoAccount
        ? 'The demo account runs on sample data, so live scans are turned off.'
        : !usage.serviceAvailable
          ? 'Scanning is paused: the free scan budget for this app has been used up.'
          : usage.nextScanAt
            ? `Daily scan limit reached. Next scan available ${formatDateTime(usage.nextScanAt)}.`
            : 'Scanning is not available right now.'
      : null

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-4 pb-12">
      <div>
        <Link to="/" aria-label="Back to products" className="mb-3 flex size-10 items-center justify-center rounded-full bg-secondary active:scale-95">
          <ArrowLeft size={20} weight="bold" />
        </Link>
        <h1 className="display">
          New <strong>scan</strong>
        </h1>
      </div>

      <section className="surface p-5">
        <h2 className="font-semibold">For a fair comparison every time</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {['Face a window with even light', 'No filters, no makeup, hair off your face', 'Hold the phone at the same distance each time', 'Your face should fill most of the frame'].map(
            (tip) => (
              <li key={tip} className="flex items-start gap-2">
                <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-primary" />
                {tip}
              </li>
            ),
          )}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Take two photos back to back. Photos are not stored, only the scores.</p>
      </section>

      {blocked ? (
        <p className="surface p-5 text-sm">{blocked}</p>
      ) : (
        <>
          <PhotoSlot label="Photo 1" previewUrl={photos[0]?.previewUrl ?? null} disabled={pending} problem={problems[0]} onFile={(f) => void onFile(0, f)} />
          <PhotoSlot label="Photo 2" previewUrl={photos[1]?.previewUrl ?? null} disabled={pending} problem={problems[1]} onFile={(f) => void onFile(1, f)} />
          {error && (
            <p role="alert" className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-medium text-red-900">
              {error}
            </p>
          )}
          <Button size="lg" disabled={!photos[0] || !photos[1] || pending} onClick={() => void onSubmit()}>
            {pending ? 'Analysing, about 10 seconds…' : 'Analyse my skin'}
          </Button>
          {usage && (
            <p className="text-center text-xs text-muted-foreground">
              {usage.remaining} of {usage.dailyLimit} scans left today
            </p>
          )}
        </>
      )}
    </main>
  )
}
