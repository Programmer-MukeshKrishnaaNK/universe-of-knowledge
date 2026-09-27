import type { IncomingMessage, ServerResponse } from 'node:http'
import { allTopics, papers } from '../src/data'
import { KnowledgeGraph } from '../src/graph/buildGraph'
import { buildMessages, composeOffline, type Mode } from './ai/prompt'
import { OfflineProvider, providerFromEnv, type AIProvider, type ChatMessage } from './ai/providers'

const MODES: Mode[] = ['simple', 'analogy', 'math', 'eli15', 'deeper', 'confused', 'question', 'next', 'paper']

type Next = (err?: unknown) => void

async function readJson(req: IncomingMessage, limit = 16_000): Promise<unknown> {
  let body = ''
  for await (const chunk of req) {
    body += chunk
    if (body.length > limit) throw new Error('Request too large')
  }
  return JSON.parse(body || '{}')
}

/** Very small fixed-window limiter — enough to stop accidental hammering. */
function limiter(perMinute: number) {
  const hits = new Map<string, { n: number; t: number }>()
  return (key: string) => {
    const now = Date.now()
    const h = hits.get(key)
    if (!h || now - h.t > 60_000) {
      hits.set(key, { n: 1, t: now })
      return true
    }
    h.n++
    return h.n <= perMinute
  }
}

/**
 * The backend for the guide. Browser → here → provider. Keys never leave
 * the server; the provider is chosen from environment variables.
 */
export function createApi(env: Record<string, string | undefined>) {
  const graph = new KnowledgeGraph(allTopics)
  const live = providerFromEnv(env)
  const allow = limiter(Number(env.AI_RATE_PER_MINUTE) || 20)
  console.log(live ? `[guide] provider: ${live.name} · model: ${live.model}` : '[guide] no AI provider configured — answering offline from the graph')

  return async (req: IncomingMessage, res: ServerResponse, next: Next) => {
    const url = req.url ?? ''
    if (!url.startsWith('/api/')) return next()

    if (url === '/api/health' && req.method === 'GET') {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(live ? { provider: live.name, model: live.model, live: true } : { provider: 'offline', model: 'knowledge-graph', live: false }))
      return
    }

    if (url === '/api/explain' && req.method === 'POST') {
      const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0] ?? req.socket.remoteAddress ?? 'local'
      if (!allow(ip)) {
        res.statusCode = 429
        res.end('The guide needs a short breather — try again in a minute.')
        return
      }
      let body: Record<string, unknown>
      try {
        body = (await readJson(req)) as Record<string, unknown>
      } catch {
        res.statusCode = 400
        res.end('Invalid request.')
        return
      }
      const topic = graph.get(String(body.topicId ?? ''))
      const mode = MODES.includes(body.mode as Mode) ? (body.mode as Mode) : null
      if (!topic || !mode) {
        res.statusCode = 400
        res.end('Unknown topic or mode.')
        return
      }
      const question = typeof body.question === 'string' ? body.question.slice(0, 400) : undefined
      // Papers must be ones this topic actually cites — the guide never explains an arbitrary id.
      const paper = mode === 'paper' && typeof body.paperId === 'string' && topic.research?.some((r) => r.paper === body.paperId) ? papers[body.paperId] : undefined
      if (mode === 'paper' && !paper) {
        res.statusCode = 400
        res.end('Unknown paper for this topic.')
        return
      }
      const depth = ['simple', 'detailed', 'technical'].includes(String(body.depth)) ? String(body.depth) : 'simple'
      const known = Array.isArray(body.known) ? body.known.filter((x): x is string => typeof x === 'string').slice(0, 60) : []
      const history: ChatMessage[] = Array.isArray(body.history)
        ? body.history
            .filter((h): h is ChatMessage => !!h && (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
            .slice(-4)
            .map((h) => ({ role: h.role, content: h.content.slice(0, 2000) }))
        : []

      res.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
      })
      const ctrl = new AbortController()
      res.on('close', () => ctrl.abort())
      const send = (payload: object | string) => res.write(`data: ${typeof payload === 'string' ? payload : JSON.stringify(payload)}\n\n`)

      const offline = new OfflineProvider(() => composeOffline(graph, topic, mode, known, paper))
      const provider = live ?? offline
      const run = async (p: AIProvider) => {
        const messages = buildMessages(graph, topic, mode, { question, depth, known, history, paper })
        for await (const delta of p.stream(messages, ctrl.signal)) send({ delta })
      }
      try {
        await run(provider)
      } catch (err) {
        if (ctrl.signal.aborted) return
        console.warn('[guide]', err instanceof Error ? err.message : err)
        if (provider.live) {
          // Degrade gracefully: the map can always answer something.
          send({ delta: '(The live guide is unavailable right now — here is what the map says.)\n\n' })
          try {
            await run(offline)
          } catch {
            send({ error: 'The guide could not answer just now.' })
          }
        } else send({ error: 'The guide could not answer just now.' })
      }
      send('[DONE]')
      res.end()
      return
    }

    res.statusCode = 404
    res.end('Not found')
  }
}
