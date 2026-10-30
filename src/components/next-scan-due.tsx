import { CalendarBlank, DownloadSimple } from '@phosphor-icons/react'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { buildWeeklyScanIcs } from '@shared/calendar/ics'
import { api } from '../../convex/_generated/api'

/** Downloads a small calendar file: an all-day event on `dueAt` (or today if that has passed) that repeats weekly. */
function downloadCalendarFile(dueAt: number) {
  const day = new Date(Math.max(dueAt, Date.now()))
  const ics = buildWeeklyScanIcs({
    date: { year: day.getFullYear(), month: day.getMonth() + 1, day: day.getDate() },
    uid: crypto.randomUUID(),
    createdAt: new Date(),
    appUrl: window.location.origin,
  })
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'receipts-weekly-scan.ics'
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const SAVED = "Saved a weekly event for that day. It repeats every week and won't move if you scan early; delete it any time."

/**
 * When the next weekly scan is due, with an "Add to calendar" button. Nothing for the demo account or before the first scan.
 * `tile`: the apricot Bento tile on Home (a calendar chip, the date and the button). `inline`: one line under a heading.
 */
export function NextScanDue({ className, variant = 'inline' }: { className?: string; variant?: 'tile' | 'inline' }) {
  const status = useQuery(api.reminders.status)
  const [now] = useState(() => Date.now())
  const [downloaded, setDownloaded] = useState(false)
  if (!status || status.isDemoAccount || status.nextDueAt === null) return null

  const dueAt = status.nextDueAt
  const overdue = now >= dueAt
  const date = new Date(dueAt)
  const days = Math.ceil((dueAt - now) / 86_400_000)
  const addButton = (extra?: string) => (
    <button
      type="button"
      onClick={() => {
        downloadCalendarFile(dueAt)
        setDownloaded(true)
      }}
      className={cn(buttonVariants({ size: 'sm' }), extra)}
    >
      <DownloadSimple size={16} weight="bold" />
      Add to calendar
    </button>
  )

  if (variant === 'tile') {
    return (
      <section className={cn('tile-accent-2 flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-center md:gap-x-4 md:gap-y-2', className)} aria-label="Next scan">
        <div className="flex items-center gap-3 md:contents">
          <span className="grid h-[68px] w-16 shrink-0 grid-rows-[22px_1fr] overflow-hidden rounded-[18px] bg-tile text-center shadow-[0_6px_14px_-8px_rgb(150_64_28/0.6)]" aria-hidden>
            <span className="bg-accent-2-ink text-[11px] leading-[22px] font-extrabold tracking-[0.08em] text-white uppercase">
              {date.toLocaleDateString(undefined, { weekday: 'short' })}
            </span>
            <span className="text-[32px] leading-[46px] font-extrabold tracking-[-0.03em] tabular-nums">{date.getDate()}</span>
          </span>
          <div className="min-w-0 md:flex-1">
            <p className="eyebrow text-accent-2-ink">
              <CalendarBlank size={16} weight="bold" />
              Next scan
            </p>
            <p className="mt-1 text-[17px] leading-tight font-extrabold">
              {overdue ? 'Your weekly scan is due' : date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {!overdue && (
              <p className="text-[13.5px] font-semibold text-ink-2">
                {days <= 1 ? 'Tomorrow' : `In ${days} days`}
              </p>
            )}
          </div>
        </div>
        {addButton('self-start md:self-center')}
        {downloaded && (
          <p className="text-[12.5px] leading-snug font-medium text-ink-2 md:basis-full" role="status">
            {SAVED}
          </p>
        )}
      </section>
    )
  }

  const label = overdue ? 'Your weekly scan is due' : `Next scan due ${date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <p className="inline-flex items-center gap-1.5 rounded-full bg-[image:var(--sheen)] bg-tile px-3 py-1.5 text-[13px] font-bold text-ink shadow-(--shadow-depth)">
        <CalendarBlank size={15} weight="bold" />
        {label}
      </p>
      <button
        type="button"
        onClick={() => {
          downloadCalendarFile(dueAt)
          setDownloaded(true)
        }}
        className="press inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-bold underline decoration-ink/30 underline-offset-4"
      >
        <DownloadSimple size={15} weight="bold" />
        Add to calendar
      </button>
      {downloaded && (
        <p className="basis-full text-[12.5px] leading-snug text-ink-2" role="status">
          {SAVED}
        </p>
      )}
    </div>
  )
}
