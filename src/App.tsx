import { lazy, Suspense, useEffect, useState } from 'react'
import { graph, universe } from './graph'
import { prepareSource } from './knowledge/sources/select'
import { useExplore } from './store/explore'
import { Controls, DepthMeter, HoverTip, Journey, LiveRegion, useKeyboardNavigation, Wordmark } from './ui/Chrome'
import { Fallback, hasWebGL } from './ui/Fallback'
import { Intro } from './ui/Intro'
import { Search } from './ui/Search'
import { RouteLine } from './ui/RouteLine'

const UniverseCanvas = lazy(() => import('./scene/UniverseCanvas'))
const TopicPanel = lazy(() => import('./ui/panel/TopicPanel'))

// Yield to the browser so each loading step paints (timers, not rAF — never stalls in background tabs).
/** Concepts loaded before the first reveal; everything beyond streams in afterwards. */
const FIRST_VIEW_BUDGET = 6000

const frame = () => new Promise((r) => setTimeout(r, 16))

/** Keep the URL in sync so any place in the universe can be shared. */
function useDeepLink() {
  const phase = useExplore((s) => s.phase)
  const focusId = useExplore((s) => s.focusId)
  useEffect(() => {
    if (phase !== 'explore') return
    const m = location.hash.match(/^#\/(.+)$/)
    const id = m ? decodeURIComponent(m[1]) : null
    if (id && graph.get(id) && !useExplore.getState().focusId) setTimeout(() => useExplore.getState().travelTo(id, 'search'), 1600)
  }, [phase])
  useEffect(() => {
    if (phase !== 'explore') return
    const next = focusId ? `#/${focusId}` : ' '
    if (location.hash !== next) history.replaceState(null, '', focusId ? next : location.pathname + location.search)
  }, [focusId, phase])
}

export default function App() {
  const [webgl] = useState(hasWebGL)
  const [ready, setReady] = useState(false)
  const focusId = useExplore((s) => s.focusId)
  const phase = useExplore((s) => s.phase)
  useKeyboardNavigation()
  useDeepLink()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const s = useExplore.getState()
      s.setPhase('loading', 'Mapping knowledge…')
      await frame()
      await prepareSource()
      const manifest = await universe.init()
      if (cancelled) return
      s.setPhase('loading', 'Connecting concepts…')
      // Regions that shape the first view load before the reveal; the rest stream in afterwards.
      const regions = [...manifest.regions].sort((a, b) => a.priority - b.priority)
      let budget = FIRST_VIEW_BUDGET
      for (const r of regions) {
        if (budget <= 0) break
        budget -= r.count
        await universe.loadRegion(r.id)
        await frame()
        if (cancelled) return
      }
      setReady(true)
      if (!webgl) s.setPhase('explore')
      // Background streaming — the universe keeps filling in while you explore.
      void universe.loadAll()
    })()
    return () => {
      cancelled = true
    }
  }, [webgl])

  return (
    <div className={`app ${focusId ? 'has-focus' : ''} ${webgl ? '' : 'is-flat'}`} data-phase={phase}>
      {webgl ? (
        ready && (
          <Suspense fallback={null}>
            <UniverseCanvas />
          </Suspense>
        )
      ) : (
        ready && <Fallback />
      )}
      <Intro />
      <header className="topbar">
        <Wordmark />
        <Search />
        <RouteLine />
      </header>
      <HoverTip />
      <Journey />
      <DepthMeter />
      <Controls />
      <Suspense fallback={null}>{focusId && <TopicPanel />}</Suspense>
      <LiveRegion />
    </div>
  )
}
