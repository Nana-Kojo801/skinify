import { ArrowsOutLineHorizontal, CaretLeft, Check, Clock, Drop, Info, Sun, UserFocus, Warning } from '@phosphor-icons/react'
import { useAction, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { preparePhoto, type PreparedPhoto } from '@/lib/prepare-photo'
import { cn } from '@/lib/utils'
import { isScanErrorData } from '@shared/scan/scan-errors'
import { api } from '../../../convex/_generated/api'
import { PhotoSlot } from './components/photo-slot'
import { ScanResult, type ScanResultData } from './components/scan-result'

type Slot = PreparedPhoto | null

const TIPS = [
  { icon: Sun, term: 'Light', text: 'Face a window. Even daylight, no lamps behind you.' },
  { icon: Drop, term: 'Bare skin', text: 'No filters, no makeup, hair off your face.' },
  { icon: ArrowsOutLineHorizontal, term: 'Distance', text: "Hold the phone at arm's length, the same way every time." },
  { icon: UserFocus, term: 'Framing', text: 'Your whole face fills most of the frame.' },
]

// Progress shown while the scan runs (about 10 seconds). Purely a timer: the server does not report steps.
const STEPS = ['Uploading', 'Reading your skin', 'Comparing the two shots', 'Saving scores']
const STEP_MS = 2400

export function ScanPage() {
  const usage = useQuery(api.scans.usage)
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
      <main className="mx-auto max-w-2xl px-4 pt-4 md:px-8 md:pt-10">
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

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-8 md:pt-8">
      <header className="flex h-16 items-center justify-between md:hidden">
        <Link to="/" aria-label="Back to products" className="press grid size-11 place-items-center rounded-full bg-sand">
          <CaretLeft size={20} weight="bold" />
        </Link>
        {usage && !blocked && (
          <span className="flex items-center gap-1.5 rounded-full bg-sand px-3.5 py-2 text-[13px] font-semibold">
            <Clock size={16} />
            {usage.remaining} of {usage.dailyLimit} left today
          </span>
        )}
      </header>

      <div className="md:grid md:grid-cols-[0.9fr_1.1fr] md:items-start md:gap-12">
        <section className="flex flex-col gap-5 md:sticky md:top-28">
          {pending ? (
            <div className="rise px-1" aria-live="polite">
              <p className="text-sm font-medium text-muted">About 10 seconds</p>
              <h1 className="mt-1 text-[36px] leading-[1.05] font-semibold tracking-[-0.035em] md:text-5xl">Reading your skin</h1>
            </div>
          ) : (
            <div className="rise px-1">
              <h1 className="text-[36px] leading-[1.05] font-semibold tracking-[-0.035em] md:text-5xl">New scan</h1>
              <p className="mt-2 text-muted md:text-[17px]">
                Two photos, back to back. We average them and measure how much they disagree, so a change is real before we call it.
              </p>
            </div>
          )}

          {pending ? (
            <ol className="card flex flex-col gap-1 p-2" aria-label="Progress">
              {STEPS.map((label, index) => {
                const done = index < step
                const active = index === step
                return (
                  <li
                    key={label}
                    className={cn(
                      'flex min-h-[52px] items-center gap-3.5 rounded-2xl px-3.5 text-[15px] font-medium transition-colors duration-300',
                      active ? 'bg-sand text-cocoa' : done ? 'text-cocoa' : 'text-muted',
                    )}
                    aria-current={active ? 'step' : undefined}
                  >
                    <span
                      className={cn(
                        'grid size-7 shrink-0 place-items-center rounded-full border-2',
                        done && 'border-working-ink bg-working-ink text-white',
                        active && 'animate-[spin_0.9s_linear_infinite] border-nude border-t-cocoa',
                        !done && !active && 'border-nude',
                      )}
                    >
                      {done && <Check size={14} weight="bold" className="animate-[pop_.4s_var(--ease-pop)_both]" />}
                    </span>
                    {label}
                  </li>
                )
              })}
            </ol>
          ) : (
            <ul className="rise grid grid-cols-2 gap-2.5" style={{ '--i': 1 } as React.CSSProperties}>
              {TIPS.map(({ icon: Icon, term, text }) => (
                <li key={term} className="tile p-4">
                  <Icon size={22} className="text-coral-ink" />
                  <p className="mt-2 font-semibold">{term}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-muted">{text}</p>
                </li>
              ))}
            </ul>
          )}
          {usage && !blocked && !pending && (
            <p className="hidden items-center gap-2 text-sm text-muted md:flex">
              <Clock size={17} />
              {usage.remaining} of {usage.dailyLimit} scans left today. Photos are never stored.
            </p>
          )}
        </section>

        <section className="mt-6 flex flex-col gap-4 md:mt-0">
          {blocked ? (
            <div className="rise relative overflow-hidden rounded-(--radius-card) bg-sand" style={{ '--i': 2 } as React.CSSProperties}>
              <img src="/images/scan-portrait.webp" alt="" className="h-56 w-full object-cover object-[50%_35%] shadow-(--shadow-photo) md:h-80" />
              <p className="flex items-start gap-2.5 p-5 text-[15px] text-cocoa-soft">
                <Info size={20} className="mt-px shrink-0" />
                {blocked}
              </p>
            </div>
          ) : (
            <>
              {error && (
                <p role="alert" className="flex animate-[pop_.35s_var(--ease-out-soft)_both] items-start gap-2.5 rounded-2xl bg-irritation-bg px-4 py-3 text-sm text-irritation-ink">
                  <Warning size={18} className="mt-px shrink-0" />
                  {error}
                </p>
              )}
              <div className="rise grid grid-cols-2 gap-3 md:gap-5" style={{ '--i': 2 } as React.CSSProperties}>
                <PhotoSlot label="Photo 1" previewUrl={photos[0]?.previewUrl ?? null} disabled={pending} analysing={pending} problem={problems[0]} onFile={(f) => void onFile(0, f)} />
                <PhotoSlot label="Photo 2" previewUrl={photos[1]?.previewUrl ?? null} disabled={pending} analysing={pending} problem={problems[1]} onFile={(f) => void onFile(1, f)} />
              </div>
              {!pending && (
                <div className="rise flex flex-col gap-2.5" style={{ '--i': 3 } as React.CSSProperties}>
                  <Button size="lg" disabled={!photos[0] || !photos[1]} onClick={() => void onSubmit()}>
                    Analyse my skin
                  </Button>
                  {usage && <p className="text-center text-[13px] text-muted md:hidden">Photos are never stored.</p>}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}
