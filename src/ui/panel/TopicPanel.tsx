import { useEffect, useRef, useState } from 'react'
import { levelName } from '../../data'
import { graph } from '../../graph'
import { useExplore, type Depth } from '../../store/explore'
import { RichText, TopicLink } from '../RichText'
import { Explain } from './Explain'
import { Glance } from './Glance'
import { KnowledgeControl } from './KnowledgeControl'
import { Path } from './Path'
import { Research } from './Research'

const DEPTHS: { id: Depth; label: string }[] = [
  { id: 'simple', label: 'Simple' },
  { id: 'detailed', label: 'Detailed' },
  { id: 'technical', label: 'Technical' },
]

function Section({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`section ${className}`}>
      <h3 className="section-label">{label}</h3>
      {children}
    </section>
  )
}

/**
 * The reading layer. It sits beside the universe (never over it), and its
 * content deepens with the Simple → Detailed → Technical control.
 */
export default function TopicPanel() {
  const focusId = useExplore((s) => s.focusId)
  const depth = useExplore((s) => s.depth)
  const setDepth = useExplore((s) => s.setDepth)
  const home = useExplore((s) => s.home)
  const reading = useExplore((s) => s.reading)
  const setReading = useExplore((s) => s.setReading)
  const scroller = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [shownId, setShownId] = useState(focusId)
  const [leaving, setLeaving] = useState(false)

  // Cross-fade content between topics instead of swapping abruptly.
  useEffect(() => {
    if (focusId === shownId) return
    if (!shownId || !focusId) {
      setShownId(focusId)
      return
    }
    setLeaving(true)
    const t = setTimeout(() => {
      setShownId(focusId)
      setLeaving(false)
      scroller.current?.scrollTo({ top: 0 })
    }, 220)
    return () => clearTimeout(t)
  }, [focusId, shownId])

  // Keep keyboard users oriented: after travelling from inside the panel (or by keyboard), land on the new title.
  const via = useExplore((s) => s.via)
  const wasInside = useRef(false)
  useEffect(() => {
    const track = () => (wasInside.current = Boolean(document.activeElement?.closest('.panel')))
    document.addEventListener('focusin', track)
    return () => document.removeEventListener('focusin', track)
  }, [])
  useEffect(() => {
    if (shownId && (via === 'keyboard' || wasInside.current)) heading.current?.focus({ preventScroll: true })
  }, [shownId, via])

  const topic = graph.get(shownId)
  const open = Boolean(focusId && topic)
  const showDetailed = depth !== 'simple'
  const showTechnical = depth === 'technical'

  return (
    <aside className={`panel ${open ? 'is-open' : ''} ${reading ? 'is-reading' : 'is-glance'}`} aria-label="Topic" aria-hidden={!open}>
      <button type="button" className="panel-handle" onClick={() => setReading(!reading)} aria-label={reading ? 'Back to the overview of this topic' : 'Read about this topic'}>
        <span />
      </button>
      {topic && (
        <div
          className={`panel-scroll ${leaving ? 'is-leaving' : ''}`}
          ref={scroller}
          key={topic.id}
          onWheel={(e) => {
            // Scrolling down on the glance is a request to read.
            if (!reading && e.deltaY > 12) setReading(true)
          }}
        >
          <header className="panel-head">
            <nav className="lineage" aria-label="Where this lives">
              <button type="button" onClick={home}>
                Universe
              </button>
              {graph.lineage(topic.id).slice(0, -1).map((t) => (
                <span key={t.id}>
                  <span className="sep" aria-hidden="true">
                    /
                  </span>
                  <TopicLink id={t.id} className="lineage-link">
                    {t.title}
                  </TopicLink>
                </span>
              ))}
            </nav>
            <p className="eyebrow">
              <span className="dot" data-domain={topic.domain} aria-hidden="true" />
              {levelName[topic.level]}
              <span className="sep">·</span>
              {topic.difficulty}
            </p>
            <h2 ref={heading} tabIndex={-1}>
              {topic.title}
            </h2>
            <p className="lede">{topic.short}</p>
            <Glance topic={topic} reading={reading} onRead={() => setReading(true)} />
            <div className="controls-row reading-only">
              <div className="depth" role="radiogroup" aria-label="Depth of explanation">
                {DEPTHS.map((d) => (
                  <button key={d.id} type="button" role="radio" aria-checked={depth === d.id} className={depth === d.id ? 'is-active' : ''} onClick={() => setDepth(d.id)}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <Explain topicId={topic.id} />
          </header>

          {reading && (
          <div className="reading">

          {topic.mapped === false && (
            <p className="uncharted">This region of the universe is still being mapped. Its bridges to what is charted are already visible — follow them.</p>
          )}

          <Section label="What is it?">
            <RichText text={topic.simple} className="rich lead-text" />
          </Section>

          {topic.intuition && (
            <Section label="Explain like I’m new">
              <RichText text={topic.intuition} />
            </Section>
          )}

          {topic.analogy && (
            <Section label="Think of it like this" className="analogy">
              <RichText text={topic.analogy} />
            </Section>
          )}

          {showDetailed && topic.howItWorks && (
            <Section label="How it actually works">
              <RichText text={topic.howItWorks} />
            </Section>
          )}

          {showTechnical && topic.technical && (
            <Section label="The technical picture">
              <RichText text={topic.technical} />
            </Section>
          )}

          {topic.math && (showTechnical || (showDetailed && topic.difficulty === 'beginner')) && (
            <Section label="The mathematics" className="math">
              <RichText text={topic.math} />
            </Section>
          )}
          {!showTechnical && (topic.technical || topic.math || (!showDetailed && topic.howItWorks)) && (
            <button type="button" className="deeper-hint" onClick={() => setDepth(showDetailed ? 'technical' : 'detailed')}>
              {showDetailed ? 'See the technical picture and the mathematics' : 'See how it actually works'} →
            </button>
          )}

          {topic.why && (
            <Section label="Why does it matter?">
              <RichText text={topic.why} />
            </Section>
          )}

          {topic.applications?.length ? (
            <Section label="Where is it used?">
              <ul className="applications">
                {topic.applications.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {topic.misconceptions?.length ? (
            <Section label="Common misconceptions">
              <ul className="myths">
                {topic.misconceptions.map((m) => (
                  <li key={m.myth}>
                    <div className="myth">
                      <span className="myth-tag">Myth</span>
                      <RichText text={m.myth} className="inline" />
                    </div>
                    <div className="truth">
                      <RichText text={m.truth} className="inline" />
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Path topicId={topic.id} />
          <Research topic={topic} />
          <KnowledgeControl topicId={topic.id} />
          <p className="panel-foot">Content is curated for this first region of the universe. Research links point to original sources.</p>
          </div>
          )}
        </div>
      )}
    </aside>
  )
}
