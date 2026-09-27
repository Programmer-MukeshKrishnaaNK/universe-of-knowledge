/**
 * Browser side of the guide. It only ever talks to our own backend; the
 * backend holds keys and chooses the provider.
 */

export type ExplainMode = 'simple' | 'analogy' | 'math' | 'eli15' | 'deeper' | 'confused' | 'question' | 'next' | 'paper'

export const EXPLAIN_MODES: { mode: ExplainMode; label: string }[] = [
  { mode: 'simple', label: 'Explain simply' },
  { mode: 'analogy', label: 'Give me an analogy' },
  { mode: 'eli15', label: 'Explain like I’m 15' },
  { mode: 'math', label: 'Explain the mathematics' },
  { mode: 'deeper', label: 'Go deeper' },
  { mode: 'confused', label: 'I don’t understand this' },
  { mode: 'next', label: 'What should I learn next?' },
]

export interface ExplainRequest {
  topicId: string
  mode: ExplainMode
  question?: string
  paperId?: string
  depth: string
  known: string[]
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export interface GuideStatus {
  provider: string
  model: string
  live: boolean
}

export async function guideStatus(): Promise<GuideStatus | null> {
  try {
    const r = await fetch('/api/health')
    if (!r.ok) return null
    return (await r.json()) as GuideStatus
  } catch {
    return null
  }
}

/** Streams the guide's answer; resolves with the full text. */
export async function streamExplain(req: ExplainRequest, onDelta: (text: string) => void, signal: AbortSignal): Promise<string> {
  const res = await fetch('/api/explain', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  })
  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => '')
    throw new Error(msg || `The guide is unavailable (${res.status}).`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const ev of events) {
      const line = ev.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') return full
      try {
        const parsed = JSON.parse(data) as { delta?: string; error?: string }
        if (parsed.error) throw new Error(parsed.error)
        if (parsed.delta) {
          full += parsed.delta
          onDelta(full)
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }
  return full
}
