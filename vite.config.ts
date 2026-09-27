import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'

type Handler = (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => void

/**
 * Mounts the guide API inside the dev server — the same module production
 * serves (`npm start`). It is loaded through Vite's module graph, so edits to
 * the server code apply without restarting.
 */
function guideApi(env: Record<string, string>): Plugin {
  return {
    name: 'universe-guide-api',
    configureServer(server) {
      let handler: Handler | null = null
      let loadedFor: unknown = null
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        try {
          const mod = (await server.ssrLoadModule('/server/api.ts')) as { createApi: (e: Record<string, string>) => Handler }
          if (loadedFor !== mod.createApi) {
            handler = mod.createApi(env)
            loadedFor = mod.createApi
          }
          handler!(req, res, next)
        } catch (err) {
          next(err)
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Loads ALL variables (not just VITE_*) for the server side only — nothing here is exposed to the client bundle.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), guideApi(env)],
    server: { port: 5250, strictPort: true },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 1600,
    },
  }
})
