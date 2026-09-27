import { domainColor } from '../data'
import { graph } from '../graph'
import { useExplore } from '../store/explore'
import { useKnowledge } from '../store/knowledge'

/** Every topic as a navigable outline — the non-spatial way through the universe. */
export function OutlineTree({ onPick }: { onPick?: () => void }) {
  const travelTo = useExplore((s) => s.travelTo)
  const focusId = useExplore((s) => s.focusId)
  const entries = useKnowledge((s) => s.entries)
  const go = (id: string) => {
    travelTo(id, 'search')
    onPick?.()
  }
  const tree = (id: string, depth: number): React.ReactNode => {
    const kids = graph.children(id)
    if (!kids.length) return null
    return (
      <ul className={`fb-level fb-level-${depth}`}>
        {kids.map((k) => (
          <li key={k.id}>
            <button type="button" className={focusId === k.id ? 'is-active' : ''} aria-current={focusId === k.id ? 'location' : undefined} onClick={() => go(k.id)}>
              {k.title}
              {entries[k.id]?.state === 'understood' && <span className="fb-known" aria-label="understood"> ✓</span>}
            </button>
            {tree(k.id, depth + 1)}
          </li>
        ))}
      </ul>
    )
  }
  return (
    <>
      {graph.topics
        .filter((t) => t.level === 0)
        .map((d) => (
          <section key={d.id} style={{ ['--c' as string]: domainColor[d.domain] }}>
            <h2>
              <button type="button" onClick={() => go(d.id)}>
                {d.title}
              </button>
              {d.mapped === false && <span className="fb-uncharted">uncharted</span>}
            </h2>
            {tree(d.id, 1)}
          </section>
        ))}
    </>
  )
}

/** When WebGL is unavailable the universe becomes its outline — nothing is lost. */
export function Fallback() {
  return (
    <div className="fallback">
      <p className="fb-note">Your browser can’t display the 3D universe, so here is its map. Every explanation and path is still here.</p>
      <OutlineTree />
    </div>
  )
}

export function hasWebGL() {
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('outline')) return false
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
