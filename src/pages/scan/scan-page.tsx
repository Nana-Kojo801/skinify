import { ArrowsOutLineHorizontal, Check, Clock, Drop, Info, Lightbulb, ScanSmiley, Sun, UserFocus, Warning } from '@phosphor-icons/react'
import { useAction, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useEffect, useRef, useState } from 'react'
import { BackLink } from '@/components/back-link'
import { IdeasToTest } from '@/components/ideas-to-test'
import { NextScanDue } from '@/components/next-scan-due'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { preparePhoto, type PreparedPhoto } from '@/lib/prepare-photo'
import { cn } from '@/lib/utils'
import { meanGap } from '@shared/scan/photo-agreement'
import { coachHints, scanBrightness } from '@shared/scan/lighting'
import { isScanErrorData } from '@shared/scan/scan-errors'
import { api } from '../../../convex/_generated/api'
import { PhotoSlots } from './components/photo-slot'
import { ScanResult, type ScanResultData } from './components/scan-result'
import { WhyTwoPhotos } from './components/why-two-photos'

type Slot = PreparedPhoto | null

const TIPS = [
  { icon: Sun, term: 'Light', text: 'Face a window. Even daylight, no lamps behind you.', tint: 'bg-accent' },
  { icon: Drop, term: 'Bare skin', text: 'No filters, no makeup, hair off your face.', tint: 'bg-accent-2' },
  { icon: ArrowsOutLineHorizontal, term: 'Distance', text: "Hold the phone at arm's length, the same way every time.", tint: 'bg-early-bg' },
  { icon: UserFocus, term: 'Framing', text: 'Your whole face fills most of the frame.', tint: 'bg-working-bg' },
]

// Progress shown while the scan runs (about 10 seconds). Purely a timer: the server does not report steps.
const STEPS = ['Uploading', 'Reading your skin', 'Comparing the two shots', 'Saving scores']
const STEP_MS = 2400

export function ScanPage() {
  const usage = useQuery(api.scans.usage)
  const products = useQuery(api.products.list)
  const lastScan = useQuery(api.scans.latest)
  const submit = useAction(api.scans.submit)
  const [photos, setPhotos] = useState<[Slot, Slot]>([null, null])
  const [problems, setProblems] = useState<[string?, string?]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<ScanResultData | null>(null)
  const photosRef = useRef(photos)

  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  // Free the in-memory previews when leaving the page.
  useEffect(() => () => photosRef.current.forEach((photo) => photo && URL.revokeObjectURL(photo.previewUrl)), [])
  // Walk through the progress steps while analysing; stay on the last one until the server answers.
  useEffect(() => {
    if (!pending) return
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), STEP_MS)
    return () => clearInterval(timer)
  }, [pending])

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
    setStep(0)
    setPending(true)
    try {
      const payload = await Promise.all(
        [photos[0], photos[1]].map(async (photo) => ({ data: await photo.blob.arrayBuffer(), contentType: photo.blob.type })),
      )
      const brightness = scanBrightness([photos[0].brightness, photos[1].brightness])
      const scan = await submit({ photos: payload, ...(brightness !== null && { brightness }) })
      photos.forEach((photo) => photo && URL.revokeObjectURL(photo.previewUrl))
      setPhotos([null, null])
      setResult({ scores: scan.scores, qualityFlag: scan.qualityFlag, gap: meanGap(scan.noise) })
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
      <main className="screen scan-result-page">
        <ScanResult
          result={result}
          ideas={<IdeasToTest scores={result.scores} qualityFlag={result.qualityFlag} products={products} canCreate={!usage?.isDemoAccount} />}
        />
      </main>
    )
  }

  // Scan quality coach: hints about the light, never blocking.
  const hints = coachHints([photos[0]?.brightness ?? null, photos[1]?.brightness ?? null], lastScan?.brightness)

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

  const tips = (
    <ul className="capture-tips" style={{ '--i': 1 } as React.CSSProperties}>
      {TIPS.map(({ icon: Icon, term, text, tint }) => (
        <li key={term} className="capture-tip">
          <span className={cn('grid size-[42px] place-items-center rounded-[14px] shadow-[inset_0_1px_0_rgb(255_255_255/0.7)]', tint)}>
            <Icon size={21} weight="bold" />
          </span>
          <p className="mt-2.5 font-bold">{term}</p>
          <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{text}</p>
        </li>
      ))}
    </ul>
  )

  const steps = (
    <ol className="flex flex-col gap-1.5" aria-label="Progress">
      {STEPS.map((label, index) => {
        const done = index < step
        const active = index === step
        return (
          <li
            key={label}
            className={cn(
              'flex min-h-[54px] items-center gap-3.5 rounded-[18px] px-3.5 text-[15px] font-semibold transition-[background-color,color,box-shadow] duration-500 ease-(--ease-liquid)',
              active ? 'tile text-ink' : done ? 'text-ink' : 'text-ink-3',
            )}
            aria-current={active ? 'step' : undefined}
          >
            <span
              className={cn(
                'grid size-[26px] shrink-0 place-items-center rounded-full border-[2.5px] text-white',
                done && 'border-working bg-working',
                active && 'spin border-ink/15 border-t-ink',
                !done && !active && 'border-ink/15',
              )}
            >
              {done && <Check size={13} weight="bold" className="animate-[pop_.45s_var(--ease-spring)_both]" />}
            </span>
            {label}
          </li>
        )
      })}
    </ol>
  )

  const remaining = usage && !blocked && (
    <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[image:var(--sheen)] bg-tile px-3.5 text-[13px] font-bold shadow-(--shadow-depth)">
      <Clock size={16} weight="bold" />
      {usage.remaining} of {usage.dailyLimit} left today
    </span>
  )

  return (
    <main className="screen scan-page">
      <header className="flex h-14 items-center justify-between px-1 md:mb-2">
        <BackLink to="/" ariaLabel="Back to products" className="md:hidden" />
        <BackLink to="/" label="Home" className="hidden md:inline-flex" />
        {!pending && remaining}
      </header>

      <div className="capture-layout">
        <section className="capture-guide">
          {pending ? (
            <div className="rise px-2" aria-live="polite">
              <p className="text-[15px] font-bold text-ink-2">About 10 seconds</p>
              <h1 className="display mt-1 text-[28px] leading-[1.1] md:text-[32px]">Reading your skin</h1>
            </div>
          ) : (
            <div className="rise px-2">
              <h1 className="display text-[28px] leading-[1.1] md:text-[32px]">Weekly scan</h1>
              <p className="mt-2 text-[15.5px] text-ink-2 md:text-[17px]">Two photos. Same spot, same light.</p>
              <NextScanDue className="mt-3 desktop-only" />
            </div>
          )}
          {pending ? <div className="hidden md:block">{steps}</div> : <div className="desktop-only">{tips}</div>}
          {!pending && !blocked && (
            <div className="hidden md:block">
              <WhyTwoPhotos />
            </div>
          )}
          {usage && !blocked && !pending && (
            <p className="hidden items-center gap-2 px-2 text-sm text-ink-2 md:flex">
              <Clock size={17} weight="bold" />
              {usage.remaining} of {usage.dailyLimit} scans left today. Photos are never stored.
            </p>
          )}
        </section>

        <section className="capture-workspace">
          {blocked ? (
            <div className="flex min-h-[260px] items-center rounded-[22px] border border-hair bg-tile md:min-h-[430px]" style={{ '--i': 2 } as React.CSSProperties}>
              <p className="flex items-start gap-3 p-8 text-[15px] leading-relaxed text-ink-2">
                <Info size={20} weight="bold" className="mt-px shrink-0" />
                {blocked}
              </p>
            </div>
          ) : (
            <>
              {error && (
                <p role="alert" className="pop-in flex items-start gap-2.5 rounded-[20px] bg-irritation-bg px-4 py-3 text-sm font-semibold text-irritation-ink">
                  <Warning size={18} weight="bold" className="mt-px shrink-0" />
                  {error}
                </p>
              )}
              <div className="rise" style={{ '--i': 2 } as React.CSSProperties}>
                <PhotoSlots
                  previews={[photos[0]?.previewUrl ?? null, photos[1]?.previewUrl ?? null]}
                  problems={problems}
                  lighting={hints.perPhoto}
                  analysing={pending}
                  onFile={(index, file) => void onFile(index, file)}
                />
              </div>
              {pending && <div className="md:hidden">{steps}</div>}
              {!pending &&
                hints.notes.map((note) => (
                  <p key={note.id} className="tile-soft pop-in flex items-start gap-2.5 p-4 text-sm leading-snug text-ink-2">
                    <Lightbulb size={18} weight="bold" className="mt-px shrink-0 text-ink" />
                    <span>
                      <strong className="block font-bold text-ink">{note.title}</strong>
                      {note.text}
                    </span>
                  </p>
                ))}
              {!pending && (
                <div className="rise flex flex-col gap-2.5" style={{ '--i': 3 } as React.CSSProperties}>
                  <Button variant="accent" size="lg" className="h-[58px]" disabled={!photos[0] || !photos[1] || !usage?.canScan} onClick={() => void onSubmit()}>
                    <ScanSmiley size={20} weight="bold" />
                    Analyse my skin
                  </Button>
                  {!photos[0] || !photos[1] ? (
                    <p className="text-center text-[13px] leading-snug text-ink-2" aria-live="polite">
                      {!photos[0] && !photos[1]
                        ? 'Take both photos to continue.'
                        : 'One more photo to go. The second one lets us measure how steady your scan is.'}
                    </p>
                  ) : (
                    usage && <p className="text-center text-[13px] text-ink-2">Photos are never stored.</p>
                  )}
                </div>
              )}
              {!pending && (
                <div className="md:hidden capture-mobile-help">
                  {tips}
                  <WhyTwoPhotos />
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}
