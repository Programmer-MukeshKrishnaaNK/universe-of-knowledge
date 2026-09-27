import { useEffect, useRef, useState } from 'react'
import { streamExplain } from '../../ai/client'
import { useExplore } from '../../store/explore'
import { useKnowledge } from '../../store/knowledge'
import { RichText } from '../RichText'

/** The guide explains one paper, grounded only in what the map records about it. */
export function PaperExplain({ topicId, paperId }: { topicId: string; paperId: string }) {
  const [text, setText] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const ctrl = useRef<AbortController | null>(null)
  const depth = useExplore((s) => s.depth)
  useEffect(() => () => ctrl.current?.abort(), [])

  const run = async () => {
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    setState('busy')
    setText('')
    const known = Object.values(useKnowledge.getState().entries)
      .filter((e) => e.state === 'understood')
      .map((e) => e.topicId)
    try {
      await streamExplain({ topicId, paperId, mode: 'paper', depth, known }, setText, c.signal)
      setState('done')
    } catch {
      if (!c.signal.aborted) setState('error')
    }
  }

  if (state === 'idle')
    return (
      <button type="button" className="paper-explain" onClick={run}>
        <span className="spark" aria-hidden="true">
          ✦
        </span>{' '}
        Explain this paper
      </button>
    )
  return (
    <div className="paper-explain-body" aria-live="polite">
      {text ? <RichText text={text} /> : state === 'busy' ? <span className="thinking">Reading it for you</span> : null}
      {state === 'error' && <p className="explain-error">The guide couldn’t explain this one just now.</p>}
    </div>
  )
}
