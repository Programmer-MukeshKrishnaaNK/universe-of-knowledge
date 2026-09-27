import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { createApi } from './server/api'

/** Mounts the guide API inside the dev/preview server — same code as production. */
function guideApi(env: Record<string, string>): Plugin {
  return {
    name: 'universe-guide-api',
    configureServer(server) {
      server.middlewares.use(createApi(env))
    },
    configurePreviewServer(server) {
      server.middlewares.use(createApi(env))
    },
  }
}

export default defineConfig(({ mode }) => {
  // Loads ALL variables (not just VITE_*) for the server side only — nothing here is exposed to the client bundle.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), guideApi(env)],
    server: { port: 5250, strictPort: true },
    preview: { port: 5251, strictPort: true },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1600,
    },
  }
})
