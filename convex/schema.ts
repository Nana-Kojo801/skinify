import { authTables } from '@convex-dev/auth/server'
import { defineSchema } from 'convex/server'

// Convex requires a default export here.
// Tables for products / scans / verdicts are added in the schema issue.
export default defineSchema({
  ...authTables,
})
