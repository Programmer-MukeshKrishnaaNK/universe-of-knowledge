import { useEffect, useRef, useState } from 'react'
import { EXPLAIN_MODES, streamExplain, type ExplainMode, type GuideStatus, guideStatus } from '../../ai/client'
import { graph } from '../../graph'
import { stepBack } from '../../graph/recommend'
import { useExplore } from '../../store/explore'
import { knowledgeOf, useKnowledge } from '../../store/knowledge'
import { RichText } from '../RichText'

let statusPromise: Promise<GuideStatus | null> | null = null

interface Turn {
  role: 'user' | 'assistant'
  content: string
  label?: string
}

/** "✨ Explain this" — the guide speaks inside the universe, never in a separate chat screen. */
export function Explain({ topicId }: { topicId: string }) {
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [status, setStatus] = useState<GuideStatus | null>(null)
  const abort = useRef<AbortController | null>(null)
  const depth = useExplore((s) => s.depth)
  const travelTo = useExplore((s) => s.travelTo)
  const topic = graph.get(topicId)!

  useEffect(() => {
    abort.current?.abort()
    setTurns([])
    setError(null)
    setBusy(false)
    setOpen(false)
  }, [topicId])

  useEffect(() => {
    if (!open) return
    statusPromise ??= guideStatus()
    statusPromise.then(setStatus)
  }, [open])

  useEffect(() => () => abort.current?.abort(), [])

  const ask = async (mode: ExplainMode, label: string, q?: string) => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setBusy(true)
    setError(null)
    const history = turns.slice(-4).map(({ role, content }) => ({ role, content }))
    const next: Turn[] = [...turns, { role: 'user', content: q ?? label, label }, { role: 'assistant', content: '' }]
    setTurns(next)
    const known = Object.values(useKnowledge.getState().entries)
      .filter((e) => e.state === 'understood')
      .map((e) => e.topicId)
    try {
      await streamExplain({ topicId, mode, question: q, depth, known, history }, (text) => {
        setTurns((t) => {
          const copy = t.slice()
          copy[copy.length - 1] = { role: 'assistant', content: text }
          return copy
        })
      }, ctrl.signal)
    } catch (e) {
      if (ctrl.signal.aborted) return
      setError(e instanceof Error ? e.message : 'The guide could not answer just now.')
      setTurns((t) => t.slice(0, -2))
    } finally {
      if (abort.current === ctrl) setBusy(false)
    }
  }

  const back = stepBack(graph, topicId, knowledgeOf)
  const lastMode = turns.length ? turns[turns.length - 2]?.label : undefined

  return (
    <section className={`explain ${open ? 'is-open' : ''}`} aria-label="Explain this">
      <button type="button" className="explain-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="spark" aria-hidden="true">✦</span> Explain this
      </button>
      {open && (
        <div className="explain-body">
          <div className="explain-modes" role="group" aria-label="How should the guide explain it?">
            {EXPLAIN_MODES.map((m) => (
              <button key={m.mode} type="button" className="chip" disabled={busy} onClick={() => ask(m.mode, m.label)}>
                {m.label}
              </button>
            ))}
          </div>

          <div className="explain-log" aria-live="polite">
            {turns.map((t, i) =>
              t.role === 'user' ? (
                <p key={i} className="explain-q">
                  {t.content}
                </p>
              ) : (
                <div key={i} className="explain-a">
                  {t.content ? <RichText text={t.content} /> : <span className="thinking">Thinking it through</span>}
                </div>
              ),
            )}
            {lastMode === 'I don’t understand this' && !busy && back && (
              <button type="button" className="step-back" onClick={() => travelTo(back.id, 'link')}>
                Let’s take one step back → {back.title}
              </button>
            )}
            {error && <p className="explain-error">{error}</p>}
          </div>

          <form
            className="explain-ask"
            onSubmit={(e) => {
              e.preventDefault()
              const q = question.trim()
              if (!q || busy) return
              setQuestion('')
              ask('question', q, q)
            }}
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 400))}
              placeholder={`Ask anything about ${topic.title}…`}
              aria-label={`Ask the guide about ${topic.title}`}
            />
            <button type="submit" disabled={busy || !question.trim()}>
              Ask
            </button>
          </form>
          {status && (
            <p className="explain-status">
              {status.live ? `Guide · ${status.model}` : 'Offline guide · answers from the knowledge graph (configure an AI provider for live answers)'}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
