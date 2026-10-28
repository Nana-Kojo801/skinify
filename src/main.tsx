import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app'
import { convex } from './lib/convex-client'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {convex ? (
      <ConvexAuthProvider client={convex}>
        <App />
      </ConvexAuthProvider>
    ) : (
      <main className="mx-auto max-w-md p-4">
        <h1 className="text-xl font-semibold">Convex is not configured</h1>
        <p className="text-sm text-neutral-500">
          Run <code>npx convex dev</code> to create a deployment and write
          VITE_CONVEX_URL to .env.local, then restart <code>npm run dev</code>.
        </p>
      </main>
    )}
  </StrictMode>,
)
