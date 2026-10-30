import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Time passing alone can change a verdict, so recompute once a day (no YouCam calls involved).
crons.daily('recompute verdicts', { hourUTC: 3, minuteUTC: 17 }, internal.verdicts.recomputeAll)

// Scan reminders: hourly, because every time zone has its own 9:00. Each user gets at most one email per due date.
crons.hourly('send scan reminders', { minuteUTC: 5 }, internal.reminders.sendDueReminders)

// Convex requires a default export here.
export default crons
