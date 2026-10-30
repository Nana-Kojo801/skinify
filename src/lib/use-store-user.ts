import { useAction, useConvexAuth } from 'convex/react'
import { useEffect, useState } from 'react'
import { api } from '../../convex/_generated/api'

/**
 * Clerk signs people in, but the app's data hangs off a `users` row in Convex. Once Convex accepts the Clerk
 * token this creates that row (first visit) or refreshes it, and reports when it is ready. Queries return nothing
 * for a user whose row doesn't exist yet, so private pages wait for `stored`.
 */
export function useStoreUser() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const store = useAction(api.users.store)
  const [stored, setStored] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    store()
      .then(() => {
        if (!cancelled) setStored(true)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
      setStored(false)
      setFailed(false)
    }
  }, [isAuthenticated, store])

  return { isLoading: isLoading || (isAuthenticated && !stored && !failed), isAuthenticated, stored, failed }
}
