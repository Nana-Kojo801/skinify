import { Camera, Check, Images, Moon, Sun, Warning } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Lighting = { level: 'ok' | 'dark' | 'bright'; text: string } | null

type PhotoSlotsProps = {
  /** In-memory previews of the two photos (never uploaded until "Analyse my skin", never stored). */
  previews: [string | null, string | null]
  /** What the server said was wrong with a photo, if anything. */
  problems: [string?, string?]
  /** The lighting hint for each photo (scan quality coach); hints never block a scan. */
  lighting: Lighting[]
  /** Shows the scanning sweep over both photos while the scan is analysed. */
  analysing: boolean
  onFile: (index: 0 | 1, file: File) => void
}

const HINTS = ['Look straight at the camera.', 'Right after photo 1: same spot, same light.'] as const

// The camera panel: a dark, camera-like tile. While a photo is missing it shows a framing guide for that photo with a
// shutter (opens the phone's own camera, capture="user") and a gallery button; once both are in it shows them side by
// side to compare. Four hidden file inputs do the actual picking, as before.
export function PhotoSlots({ previews, problems, lighting, analysing, onFile }: PhotoSlotsProps) {
  const cameraRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const galleryRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]
  const firstEmpty = previews[0] === null ? 0 : previews[1] === null ? 1 : null
  const [chosen, setChosen] = useState<0 | 1 | null>(null)
  // The photo being taken: the one the person picked in the switch, else the first missing one.
  const active = chosen !== null && previews[chosen] === null ? chosen : firstEmpty
  const showPair = active === null || analysing
  const current: 0 | 1 = active ?? 0

  function handle(index: 0 | 1, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) {
      setChosen(null)
      onFile(index, file)
    }
  }
  const camera = (index: 0 | 1) => cameraRefs[index].current?.click()
  const gallery = (index: 0 | 1) => galleryRefs[index].current?.click()

  const status = (index: 0 | 1) => (problems[index] ? 'bad' : previews[index] ? 'done' : active === index ? 'now' : 'next')
  const STATUS_WORD = { bad: 'Retake', done: 'Ready', now: 'Now', next: 'Next' } as const

  return (
    <section
      className="camera-panel"
      aria-label="Your two photos"
    >
      {analysing ? (
        <p className="flex h-11 items-center justify-center gap-2.5 rounded-full bg-white/8 text-sm font-semibold" aria-live="polite">
          <span className="spin size-5 rounded-full border-[2.5px] border-white/20 border-t-accent" aria-hidden />
          Reading your skin
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-1 rounded-full bg-white/7 p-1 shadow-[inset_0_1px_2px_rgb(0_0_0/0.4)]" role="group" aria-label="Photos">
          {([0, 1] as const).map((index) => {
            const st = status(index)
            const on = st === 'now' || st === 'bad'
            return (
              <button
                key={index}
                type="button"
                onClick={() => setChosen(index)}
                disabled={previews[index] !== null}
                aria-pressed={on}
                className={cn(
                  'flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-semibold transition-[background-color,color,box-shadow] duration-500 ease-(--ease-liquid) disabled:cursor-default',
                  on ? 'bg-linear-to-b from-white/22 to-white/10 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22)]' : 'text-white/60',
                )}
              >
                <i
                  className={cn(
                    'grid size-[22px] place-items-center rounded-full border-[1.5px] border-white/35 text-xs font-semibold not-italic',
                    st === 'now' && 'border-accent bg-accent text-ink',
                    st === 'done' && 'border-working bg-working',
                    st === 'bad' && 'border-irritation bg-irritation text-fog',
                  )}
                >
                  {st === 'done' ? <Check size={12} weight="bold" /> : st === 'bad' ? '!' : index + 1}
                </i>
                Photo {index + 1}
                <em className="text-xs font-semibold not-italic opacity-65">{STATUS_WORD[st]}</em>
              </button>
            )
          })}
        </div>
      )}

      {showPair ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {([0, 1] as const).map((index) => {
            const problem = problems[index]
            const light = lighting[index]
            return (
              <div key={index} className="flex flex-col items-center gap-2">
                <div className="relative aspect-[3/4.4] w-full overflow-hidden rounded-[22px] bg-[#242629] md:aspect-auto md:h-[440px]">
                  {previews[index] && (
                    <img src={previews[index]!} alt={`Photo ${index + 1} of 2`} className={cn('settle size-full object-cover', problem && 'brightness-50 grayscale-[.6]')} />
                  )}
                  <span className="absolute top-2.5 left-2.5 inline-flex h-7 items-center rounded-full bg-black/35 px-2.5 text-xs font-semibold backdrop-blur-md">
                    Photo {index + 1}
                  </span>
                  {analysing ? (
                    <>
                      <span aria-hidden className="absolute inset-[12%_16%_18%] rounded-[50%/44%] border-2 border-dashed border-white/75" />
                      <span aria-hidden className="absolute inset-x-0 top-0 h-[42%] animate-[sweep_1.7s_cubic-bezier(.45,0,.55,1)_infinite_alternate] bg-linear-to-b from-transparent via-accent/45 to-white/90" />
                    </>
                  ) : problem ? (
                    <p role="alert" className="pop-in absolute inset-x-2 bottom-2 flex flex-col gap-1 rounded-[18px] bg-irritation/92 p-3 text-xs leading-snug shadow-[0_10px_20px_-10px_rgb(0_0_0/0.6)]">
                      <Warning size={20} weight="bold" />
                      <strong className="text-base font-semibold">Retake</strong>
                      {problem}
                    </p>
                  ) : (
                    <>
                      <span className="pop-in absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-full bg-working shadow-[0_4px_10px_-4px_rgb(0_0_0/0.5)]">
                        <Check size={15} weight="bold" />
                      </span>
                      {light && (
                        <span
                          className={cn(
                            'pop-in absolute bottom-2 left-2 inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold shadow-[0_6px_14px_-6px_rgb(0_0_0/0.5)]',
                            light.level === 'ok' ? 'bg-working-bg text-working-ink' : 'bg-canttell-bg text-canttell-ink',
                          )}
                          style={{ '--i': 2 } as React.CSSProperties}
                        >
                          {light.level === 'dark' ? <Moon size={14} weight="bold" /> : <Sun size={14} weight="bold" />}
                          {light.text}
                        </span>
                      )}
                    </>
                  )}
                </div>
                {!analysing && (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => camera(index)}
                      className={cn('press inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-semibold', problem ? 'bg-white text-[#191a1c]' : 'glass-clear')}
                    >
                      <Camera size={17} weight="bold" />
                      Retake
                    </button>
                    <button type="button" onClick={() => gallery(index)} aria-label={`Gallery, photo ${index + 1}`} className="glass-clear press grid size-11 cursor-pointer place-items-center rounded-full">
                      <Images size={17} weight="bold" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => camera(current)}
            className="camera-viewfinder"
            aria-label={`Take photo ${current + 1}`}
          >
            <span className="camera-placeholder" aria-hidden><Camera size={42} weight="thin" /><span>Open camera</span></span>
            {['top-4 left-4 rounded-tl-xl border-t-[3px] border-l-[3px]', 'top-4 right-4 rounded-tr-xl border-t-[3px] border-r-[3px]', 'bottom-4 left-4 rounded-bl-xl border-b-[3px] border-l-[3px]', 'right-4 bottom-4 rounded-br-xl border-r-[3px] border-b-[3px]'].map(
              (pos) => (
                <span key={pos} aria-hidden className={cn('absolute size-[30px] border-white/85', pos)} />
              ),
            )}
            <span className="glass-clear absolute bottom-5 left-1/2 w-max max-w-[82%] -translate-x-1/2 rounded-[18px] px-4 py-2.5 text-center text-xs leading-snug text-white/85">
              <strong className="block text-sm text-white">Photo {current + 1} of 2</strong>
              {HINTS[current]}
            </span>
          </button>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-2 pt-4 pb-1.5">
            <button type="button" onClick={() => gallery(current)} className="press flex cursor-pointer flex-col items-center gap-1.5 text-xs font-semibold text-white/70">
              <span className="grid size-[52px] place-items-center rounded-full bg-white/12 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]">
                <Images size={22} weight="bold" />
              </span>
              Gallery
            </button>
            <button
              type="button"
              onClick={() => camera(current)}
              aria-label="Camera"
              className="camera-shutter press"
            >
              <span aria-hidden />
            </button>
            {(() => {
              const other = current === 0 ? 1 : 0
              const preview = previews[other]
              return (
                <button
                  type="button"
                  onClick={() => (preview ? camera(other) : setChosen(other))}
                  aria-label={preview ? `Retake photo ${other + 1}` : `Switch to photo ${other + 1}`}
                  className="press flex cursor-pointer flex-col items-center gap-1.5 text-xs font-semibold text-white/70"
                >
                  <span className={cn('relative grid size-[52px] place-items-center overflow-hidden rounded-2xl text-base font-semibold', preview ? 'border-2 border-white/90' : 'border-2 border-dashed border-white/25 text-white/55')}>
                    {preview ? (
                      <>
                        <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />
                        <i className="absolute right-[3px] bottom-[3px] grid size-[18px] place-items-center rounded-full bg-working text-white">
                          <Check size={11} weight="bold" />
                        </i>
                      </>
                    ) : (
                      other + 1
                    )}
                  </span>
                  Photo {other + 1}
                </button>
              )
            })()}
          </div>
        </>
      )}

      {([0, 1] as const).map((index) => (
        <span key={index} className="hidden">
          <input ref={cameraRefs[index]} type="file" accept="image/*" capture="user" onChange={(e) => handle(index, e)} />
          <input ref={galleryRefs[index]} type="file" accept="image/jpeg,image/png" onChange={(e) => handle(index, e)} />
        </span>
      ))}
    </section>
  )
}
