import type { KnowledgeState } from '../../data/schema'
import { useKnowledge } from '../../store/knowledge'

const OPTIONS: { state: KnowledgeState; label: string }[] = [
  { state: 'learning', label: 'Learning' },
  { state: 'understood', label: 'Understood' },
  { state: 'review', label: 'Review' },
  { state: 'want_to_learn', label: 'Later' },
]

/** Where this topic sits on the learner’s own map. */
export function KnowledgeControl({ topicId }: { topicId: string }) {
  const entry = useKnowledge((s) => s.entries[topicId])
  const set = useKnowledge((s) => s.set)
  return (
    <div className="know" role="group" aria-label="Your knowledge of this topic">
      <span className="know-label">Your map</span>
      {OPTIONS.map((o) => {
        const active = entry?.state === o.state
        return (
          <button
            key={o.state}
            type="button"
            className={`know-opt ${active ? 'is-active' : ''}`}
            data-state={o.state}
            aria-pressed={active}
            onClick={() => set(topicId, active ? 'discovered' : o.state)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
