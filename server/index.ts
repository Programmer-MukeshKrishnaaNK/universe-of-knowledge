/**
 * Production server: serves the built app from ./dist and the guide API.
 *   npm run build && npm start
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApi } from './api'

try {
  process.loadEnvFile?.()
} catch {
  /* no .env file — rely on the real environment */
}

const root = fileURLToPath(new URL('../dist', import.meta.url))
const api = createApi(process.env)
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
}

createServer((req, res) => {
  api(req, res, () => {
    const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '')
    let file = join(root, path)
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html')
    res.setHeader('content-type', types[extname(file)] ?? 'application/octet-stream')
    if (file.includes('/assets/')) res.setHeader('cache-control', 'public, max-age=31536000, immutable')
    createReadStream(file).pipe(res)
  })
}).listen(Number(process.env.PORT) || 8787, () => console.log(`Universe of Knowledge → http://localhost:${process.env.PORT || 8787}`))
