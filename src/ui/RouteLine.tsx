import { graph } from '../graph'
import { useExplore } from '../store/explore'

/** While a search journey is under way, name the regions it passes through. */
export function RouteLine() {
  const route = useExplore((s) => s.route)
  if (!route) return null
  const done = route.reached >= route.ids.length
  return (
    <div className={`route-line ${done ? 'is-done' : ''}`} aria-hidden="true">
      {route.ids.map((id, k) => (
        <span key={id} className={k < route.reached ? 'is-past' : k === route.reached ? 'is-next' : ''}>
          {k > 0 && <span className="route-sep">→</span>}
          {graph.get(id)?.title}
        </span>
      ))}
    </div>
  )
}
