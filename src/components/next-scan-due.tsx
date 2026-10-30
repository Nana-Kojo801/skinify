import { CalendarBlank, DownloadSimple } from '@phosphor-icons/react'
import { useQuery } from 'convex/react'
import { useState } from 'react'
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

/** "Next scan due Fri, 6 Nov" under the page heading, with an "Add to calendar" button. Nothing for the demo account or before the first scan. */
export function NextScanDue({ className }: { className?: string }) {
  const status = useQuery(api.reminders.status)
  const [now] = useState(() => Date.now())
  const [downloaded, setDownloaded] = useState(false)
  if (!status || status.isDemoAccount || status.nextDueAt === null) return null

  const dueAt = status.nextDueAt
  const overdue = now >= dueAt
  const label = overdue ? 'Your weekly scan is due' : `Next scan due ${new Date(dueAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <p className="inline-flex items-center gap-1.5 rounded-full bg-sand px-3 py-1.5 text-[13px] font-semibold text-cocoa-soft">
        <CalendarBlank size={15} />
        {label}
      </p>
      <button
        type="button"
        onClick={() => {
          downloadCalendarFile(dueAt)
          setDownloaded(true)
        }}
        className="press inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold underline decoration-cocoa/30 underline-offset-4"
      >
        <DownloadSimple size={15} />
        Add to calendar
      </button>
      {downloaded && (
        <p className="basis-full text-[12.5px] leading-snug text-muted" role="status">
          Saved a weekly event for that day. It repeats every week and won't move if you scan early; delete it any time.
        </p>
      )}
    </div>
  )
}
