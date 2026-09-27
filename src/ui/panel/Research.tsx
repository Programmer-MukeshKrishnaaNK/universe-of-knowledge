import { papers } from '../../data'
import type { PaperKind, Topic } from '../../data/schema'
import { PaperExplain } from './PaperExplain'

const KIND_LABEL: Record<PaperKind, string> = {
  foundational: 'Foundational papers',
  experiment: 'Important experiments',
  review: 'Reviews & guides',
  recent: 'Recent research',
}
const ORDER: PaperKind[] = ['foundational', 'experiment', 'review', 'recent']
const LEVEL: Record<string, string> = { beginner: 'Readable by anyone', intermediate: 'Some background', advanced: 'Advanced', research: 'Research level' }

export function Research({ topic }: { topic: Topic }) {
  const refs = topic.research ?? []
  if (!refs.length && !topic.openQuestions?.length) return null
  return (
    <section className="section research">
      <h3 className="section-label">Research</h3>
      {ORDER.map((kind) => {
        const group = refs.filter((r) => r.kind === kind).map((r) => papers[r.paper]).filter(Boolean)
        if (!group.length) return null
        return (
          <div key={kind} className="paper-group">
            <h4>{KIND_LABEL[kind]}</h4>
            {group
              .sort((a, b) => a.year - b.year)
              .map((p) => (
                <details key={p.id} className="paper">
                  <summary>
                    <span className="paper-title">{p.title}</span>
                    <span className="paper-meta">
                      {p.authors} · {p.year}
                    </span>
                  </summary>
                  <div className="paper-body">
                    <p className="paper-pub">{p.publication}</p>
                    <p>{p.summary}</p>
                    <p>
                      <span className="paper-why">Why it matters.</span> {p.whyItMatters}
                    </p>
                    <p className="paper-level">{LEVEL[p.background]}</p>
                    <PaperExplain topicId={topic.id} paperId={p.id} />
                    <p className="paper-links">
                      {p.arxiv && (
                        <a href={`https://arxiv.org/abs/${p.arxiv}`} target="_blank" rel="noreferrer">
                          Read free on arXiv ↗
                        </a>
                      )}
                      {p.doi && (
                        <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">
                          Publisher (DOI) ↗
                        </a>
                      )}
                      {!p.doi && !p.arxiv && (
                        <a href={`https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`} target="_blank" rel="noreferrer">
                          Find this work ↗
                        </a>
                      )}
                    </p>
                  </div>
                </details>
              ))}
          </div>
        )
      })}
      {topic.openQuestions?.length ? (
        <div className="paper-group">
          <h4>Open questions</h4>
          <ul className="open-q">
            {topic.openQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
