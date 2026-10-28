import { ConvexReactClient } from 'convex/react'

const url = import.meta.env.VITE_CONVEX_URL

// Null when VITE_CONVEX_URL is not set, so the app can show a setup hint
// instead of crashing. See README / .env.example.
export const convex = url ? new ConvexReactClient(url) : null
