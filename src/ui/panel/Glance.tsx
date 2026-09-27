import type { Topic } from '../../data/schema'
import { graph } from '../../graph'
import { advise } from '../../graph/recommend'
import { useKnowledge } from '../../store/knowledge'
import { TopicLink } from '../RichText'

function Row({ label, hint, topics, knownIds }: { label: string; hint: string; topics: Topic[]; knownIds?: Set<string> }) {
  if (!topics.length) return null
  const shown = topics.slice(0, 5)
  return (
    <div className="glance-row">
      <span className="glance-label" title={hint}>
        {label}
      </span>
      <span className="glance-chips">
        {shown.map((t) => (
          <TopicLink key={t.id} id={t.id} className={`chip-link ${knownIds?.has(t.id) ? 'is-known' : ''}`}>
            <span className="dot" data-domain={t.domain} aria-hidden="true" />
            {t.title}
          </TopicLink>
        ))}
        {topics.length > shown.length && <span className="glance-more">+{topics.length - shown.length}</span>}
      </span>
    </div>
  )
}

/**
 * What you see on arrival: where this idea sits — what it builds on, what it
 * connects to, where it leads — before any reading is asked of you.
 */
export function Glance({ topic, reading, onRead }: { topic: Topic; reading: boolean; onRead: () => void }) {
  const entries = useKnowledge((s) => s.entries)
  const know = (id: string) => entries[id]?.state
  const a = advise(graph, topic.id, know)
  const known = new Set(a.direct.filter((d) => d.known).map((d) => d.topic.id))
  const builds = a.direct.map((d) => d.topic)
  const leads = graph.deeper(topic.id)
  const related = graph.related(topic.id).filter((t) => !builds.some((b) => b.id === t.id) && !leads.some((l) => l.id === t.id) && t.id !== topic.parent)

  return (
    <div className={`glance ${reading ? 'is-reading' : ''}`}>
      {!reading && (
        <>
          <Row label="Builds on" hint="What makes this easier to understand" topics={builds} knownIds={known} />
          <Row label="Connects to" hint="Ideas beside this one" topics={related} />
          <Row label="Leads to" hint="Where to go after understanding this" topics={leads} />
          {!builds.length && !leads.length && !related.length && <p className="muted">A region still being charted.</p>}
          {builds.length > 0 && (
            <p className={`glance-ready ${a.ready ? 'is-ready' : ''}`}>
              {a.ready ? 'You’re prepared for this.' : a.direct.length && known.size ? `You know ${known.size} of ${a.direct.length} stepping stones.` : 'Readable without them — they just help.'}
            </p>
          )}
          <button type="button" className="read-btn" onClick={onRead}>
            Read <span aria-hidden="true">↓</span>
          </button>
        </>
      )}
    </div>
  )
}
