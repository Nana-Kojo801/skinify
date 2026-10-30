import { CalendarBlank } from '@phosphor-icons/react'
import { useQuery } from 'convex/react'
import { useState } from 'react'
import { api } from '../../convex/_generated/api'

/** "Next scan due Fri, 6 Nov" under the page heading. Nothing for the demo account or before the first scan. */
export function NextScanDue({ className }: { className?: string }) {
  const status = useQuery(api.reminders.status)
  const [now] = useState(() => Date.now())
  if (!status || status.isDemoAccount || status.nextDueAt === null) return null

  const overdue = now >= status.nextDueAt
  const label = overdue
    ? 'Your weekly scan is due'
    : `Next scan due ${new Date(status.nextDueAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`
  return (
    <p className={`inline-flex items-center gap-1.5 rounded-full bg-sand px-3 py-1.5 text-[13px] font-semibold text-cocoa-soft ${className ?? ''}`}>
      <CalendarBlank size={15} />
      {label}
    </p>
  )
}
