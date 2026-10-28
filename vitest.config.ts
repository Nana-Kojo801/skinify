import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // convex-test must be processed by vite so it can load the Convex modules
    server: { deps: { inline: ['convex-test'] } },
  },
})
