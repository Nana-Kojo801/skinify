import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Time passing alone can change a verdict, so recompute once a day (no YouCam calls involved).
crons.daily('recompute verdicts', { hourUTC: 3, minuteUTC: 17 }, internal.verdicts.recomputeAll)

// Convex requires a default export here.
export default crons
