import type { Topic } from '../../data/schema'
import { graph } from '../../graph'
import { advise } from '../../graph/recommend'
import { useExplore } from '../../store/explore'
import { useKnowledge } from '../../store/knowledge'
import { TopicLink } from '../RichText'

function TopicList({ topics, empty }: { topics: Topic[]; empty?: string }) {
  if (!topics.length) return empty ? <p className="muted">{empty}</p> : null
  return (
    <ul className="topic-list">
      {topics.map((t) => (
        <li key={t.id}>
          <TopicLink id={t.id} className="topic-row">
            <span className="dot" data-domain={t.domain} aria-hidden="true" />
            <span className="topic-row-title">{t.title}</span>
            <span className="topic-row-short">{t.short}</span>
          </TopicLink>
        </li>
      ))}
    </ul>
  )
}

/**
 * Prerequisites → related → go deeper, personalised by the learner’s map.
 * The wording never makes anyone feel behind: gaps are invitations.
 */
export function Path({ topicId }: { topicId: string }) {
  const entries = useKnowledge((s) => s.entries)
  const set = useKnowledge((s) => s.set)
  const travelTo = useExplore((s) => s.travelTo)
  const know = (id: string) => entries[id]?.state
  const a = advise(graph, topicId, know)
  const related = graph.related(topicId).filter((t) => !a.direct.some((d) => d.topic.id === t.id))

  return (
    <>
      <section className="section">
        <h3 className="section-label">What should I know first?</h3>
        {a.direct.length === 0 ? (
          <p className="lede-small">Nothing required — this is a wonderful place to start.</p>
        ) : a.ready ? (
          <p className="lede-small ready">You’re already prepared for this. Here’s what to explore next.</p>
        ) : (
          <>
            <p className="muted">These make it easier. Tick off what you already know — the map will adapt.</p>
            <ul className="prereq-list">
              {a.direct.map(({ topic, known }) => (
                <li key={topic.id} className={known ? 'is-known' : ''}>
                  <button
                    type="button"
                    className="check"
                    aria-pressed={known}
                    aria-label={known ? `Unmark ${topic.title} as understood` : `I already understand ${topic.title}`}
                    onClick={() => set(topic.id, known ? 'discovered' : 'understood')}
                  >
                    <span aria-hidden="true">{known ? '✓' : ''}</span>
                  </button>
                  <TopicLink id={topic.id} className="prereq-link">
                    {topic.title}
                  </TopicLink>
                  <span className="prereq-short">{topic.short}</span>
                </li>
              ))}
            </ul>
            {a.stepBack && (
              <button type="button" className="step-back" onClick={() => travelTo(a.stepBack!.id, 'link')}>
                Let’s take one step back → {a.stepBack.title}
              </button>
            )}
          </>
        )}
      </section>

      {a.next.length > 0 && (
        <section className="section">
          <h3 className="section-label">Go deeper</h3>
          <TopicList topics={a.next.slice(0, 8)} />
        </section>
      )}

      {related.length > 0 && (
        <section className="section">
          <h3 className="section-label">What connects to this?</h3>
          <TopicList topics={related.slice(0, 8)} />
        </section>
      )}
    </>
  )
}
