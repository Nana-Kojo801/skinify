import { ClerkProvider, useAuth } from '@clerk/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app'
import { ErrorBoundary } from './components/error-boundary'
import { convex } from './lib/convex-client'

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {convex && clerkKey ? (
      <ClerkProvider publishableKey={clerkKey}>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    ) : (
      <main className="mx-auto max-w-md p-4">
        <h1 className="text-xl font-semibold">Receipts is not configured</h1>
        <p className="text-sm text-neutral-500">
          Run <code>npx convex dev</code> to create a deployment and write VITE_CONVEX_URL to .env.local, and add
          VITE_CLERK_PUBLISHABLE_KEY (Clerk dashboard, API keys) to .env.local, then restart <code>npm run dev</code>.
        </p>
      </main>
    )}
  </StrictMode>,
)

// Installable PWA: register the service worker in production builds only (it would get in the way of dev HMR).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}
