import { ArrowLeft } from '@phosphor-icons/react'
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
      <main className="mx-auto max-w-3xl px-5 pt-8 pb-20 md:px-8 md:pt-14">
        <ScanResult result={result} />
      </main>
    )
  }

  const blocked =
    usage !== undefined && !usage.canScan
      ? usage.isDemoAccount
        ? 'The demo account runs on sample data, so live scans are turned off. Create your own account to scan.'
        : !usage.serviceAvailable
          ? 'Scanning is paused: the free scan budget for this app has been used up.'
          : usage.nextScanAt
            ? `Daily scan limit reached. Next scan available ${formatDateTime(usage.nextScanAt)}.`
            : 'Scanning is not available right now.'
      : null

  const tips = [
    ['Light', 'Face a window. Even daylight, no lamps behind you.'],
    ['Bare skin', 'No filters, no makeup, hair off your face.'],
    ['Distance', 'Hold the phone at arm\'s length, the same way every time.'],
    ['Framing', 'Your whole face fills most of the frame.'],
  ]

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-5 pt-6 pb-20 md:grid-cols-[0.85fr_1.15fr] md:gap-14 md:px-8 md:pt-10">
      <aside className="rise relative md:sticky md:top-28 md:self-start">
        <img src="/images/scan-portrait.jpg" alt="" className="aspect-[4/3] w-full rounded-lg object-cover object-[50%_30%] md:aspect-[4/5]" />
        <Link
          to="/"
          aria-label="Back to products"
          className="absolute top-4 left-4 flex size-11 items-center justify-center rounded-full bg-white text-navy transition-transform active:scale-95"
        >
          <ArrowLeft size={20} weight="bold" />
        </Link>
        <p className="mt-3 text-sm text-muted-foreground">Soft window light like this gives the most consistent scores.</p>
      </aside>

      <div className="flex flex-col gap-9">
        <div className="rise" style={{ '--i': 1 } as React.CSSProperties}>
          <h1 className="heading text-5xl md:text-6xl">
            New <strong>scan</strong>
          </h1>
          <p className="mt-3 max-w-lg text-lg text-white/75">
            Two photos, back to back. We average them and measure how much they disagree, so a change is real before we call it.
          </p>
        </div>

        <dl className="rise grid gap-px overflow-hidden rounded-lg bg-white/10 sm:grid-cols-2" style={{ '--i': 2 } as React.CSSProperties}>
          {tips.map(([term, text]) => (
            <div key={term} className="bg-navy p-5">
              <dt className="font-bold">{term}</dt>
              <dd className="mt-1 text-sm text-white/75">{text}</dd>
            </div>
          ))}
        </dl>

        {blocked ? (
          <p className="rounded-lg bg-taupe p-6 text-white">{blocked}</p>
        ) : (
          <div className="rise flex flex-col gap-5" style={{ '--i': 3 } as React.CSSProperties}>
            <div className="grid gap-5 sm:grid-cols-2">
              <PhotoSlot label="Photo 1" previewUrl={photos[0]?.previewUrl ?? null} disabled={pending} problem={problems[0]} onFile={(f) => void onFile(0, f)} />
              <PhotoSlot label="Photo 2" previewUrl={photos[1]?.previewUrl ?? null} disabled={pending} problem={problems[1]} onFile={(f) => void onFile(1, f)} />
            </div>
            {error && (
              <p role="alert" className="rounded-md bg-[#3d1717] px-4 py-3 text-sm text-[#f7c3bd]">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-5">
              <Button size="lg" disabled={!photos[0] || !photos[1] || pending} onClick={() => void onSubmit()}>
                {pending ? 'Analysing, about 10 seconds…' : 'Analyse my skin'}
              </Button>
              {usage && (
                <span className="text-sm text-muted-foreground">
                  {usage.remaining} of {usage.dailyLimit} scans left today. Photos are never stored.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
