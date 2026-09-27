/**
 * AI provider abstraction. The app depends only on `AIProvider`; which model
 * or vendor sits behind it is configuration (see .env.example).
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIProvider {
  readonly name: string
  readonly model: string
  readonly live: boolean
  stream(messages: ChatMessage[], signal: AbortSignal): AsyncIterable<string>
}

/** Works with OpenRouter, OpenAI, Groq, Together, Ollama — anything speaking /chat/completions. */
export class OpenAICompatibleProvider implements AIProvider {
  readonly live = true
  constructor(
    readonly name: string,
    private baseURL: string,
    private apiKey: string | undefined,
    readonly model: string,
    private extraHeaders: Record<string, string> = {},
  ) {}

  async *stream(messages: ChatMessage[], signal: AbortSignal): AsyncIterable<string> {
    const res = await fetch(`${this.baseURL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        ...this.extraHeaders,
      },
      body: JSON.stringify({ model: this.model, messages, stream: true, temperature: 0.4, max_tokens: 900 }),
    })
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Provider ${this.name} responded ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`)
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) return
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') return
        try {
          const json = JSON.parse(data)
          const delta: string | undefined = json.choices?.[0]?.delta?.content
          if (delta) yield delta
        } catch {
          /* keep-alive comments and partial frames */
        }
      }
    }
  }
}

/** No network at all: the guide answers from the curated graph. */
export class OfflineProvider implements AIProvider {
  readonly name = 'offline'
  readonly model = 'knowledge-graph'
  readonly live = false
  constructor(private compose: (messages: ChatMessage[]) => string) {}

  async *stream(messages: ChatMessage[], signal: AbortSignal): AsyncIterable<string> {
    const text = this.compose(messages)
    // Stream in small pieces so the UI behaves identically to a live model.
    for (const piece of text.match(/\S+\s*/g) ?? []) {
      if (signal.aborted) return
      yield piece
      await new Promise((r) => setTimeout(r, 12))
    }
  }
}

/** The configured live provider, or null when the guide should answer offline. */
export function providerFromEnv(env: Record<string, string | undefined>): AIProvider | null {
  const kind = (env.AI_PROVIDER ?? 'openrouter').toLowerCase()
  if (kind === 'openrouter' && env.OPENROUTER_API_KEY) {
    return new OpenAICompatibleProvider('openrouter', 'https://openrouter.ai/api/v1', env.OPENROUTER_API_KEY, env.AI_MODEL || 'meta-llama/llama-3.3-70b-instruct:free', {
      'HTTP-Referer': env.PUBLIC_URL || 'http://localhost',
      'X-Title': 'The Universe of Knowledge',
    })
  }
  if (kind === 'openai-compatible' && env.AI_BASE_URL) {
    return new OpenAICompatibleProvider('openai-compatible', env.AI_BASE_URL, env.AI_API_KEY, env.AI_MODEL || 'default')
  }
  return null
}
