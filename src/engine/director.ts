import { Spherical, Vector3 } from 'three'
import { graph, getLayout, universe } from '../graph'
import { journeyRoute } from '../knowledge/traverse'
import { currentProfile, useSettings } from '../store/settings'
import { levelName } from '../data'
import { useExplore } from '../store/explore'
import { knowledgeOf, useKnowledge } from '../store/knowledge'
import { clamp, prefersReducedMotion } from '../lib/motion'
import { CameraRig } from './camera'
import { FOCUS_RADIUS, OUTER_RING, World } from './world'
import { ripples } from './ripples'

/**
 * The director owns choreography: it listens to intent (the explore store)
 * and turns it into coordinated camera flights, graph rearrangements and
 * emphasis changes. Nothing else moves the camera programmatically.
 */

// Engine singletons survive hot reloads in development (they own GPU buffers and the camera).
const cache = (import.meta.env.DEV ? globalThis : {}) as { __uokEngine?: { rig: CameraRig; world: World | null; viewport: { width: number; height: number }; started: boolean } }
const engine = (cache.__uokEngine ??= { rig: new CameraRig(), world: null, viewport: { width: 1, height: 1 }, started: false })
export const rig = engine.rig
export let world: World | null = engine.world
export const viewport = engine.viewport

export const isCompact = () => viewport.width < 900

/** Screen space covered by the reading panel (mirrors the CSS in ui/panel.css). */
export function panelInset() {
  // Compact: the bottom sheet plus the journey/controls row that floats above it.
  if (isCompact()) return { x: 0, y: Math.round(viewport.height * 0.46) + 52 }
  return { x: clamp(viewport.width * 0.32, 380, 480), y: 0 }
}

export function initWorld() {
  if (!world) {
    // Room for the whole manifest (plus headroom) — regions ignite into it as they stream in.
    const capacity = Math.max(universe.capacity, graph.size) + 64
    // The camera may travel as far as the universe is large.
    rig.maxRadius = Math.max(720, universe.extent * 4)
    world = engine.world = new World(graph, capacity, () => universe.positions, universe.center, currentProfile().edgeBudget)
    const existing = graph.topics.map((_, i) => i)
    if (existing.length) world.addNodes(existing, 0)
    world.setKnowledge(knowledgeOf)
    universe.onRegion(({ indices }) => {
      const w = world!
      // Streamed regions ignite gently where they are; the first batch is timed by the intro.
      w.addNodes(indices, 2.5)
      w.setKnowledge(knowledgeOf)
      w.setTravelled(useKnowledge.getState().paths)
    })
  }
  return world
}

/** The overview frames every mapped domain, whatever the dataset size. */
const OVERVIEW_RADIUS = () => universe.extent * (isCompact() ? 2.482 : 1.788) // = Phase 2's 340 / 245 for the curated universe

function overviewPose(w: World) {
  const s = new Spherical().setFromVector3(rig.position.clone().sub(rig.target))
  s.radius = OVERVIEW_RADIUS()
  s.phi = 1.14
  if (!Number.isFinite(s.theta)) s.theta = 0.6
  const look = w.center.clone()
  return { look, position: new Vector3().setFromSpherical(s).add(look) }
}

/** Constellation shape for the current screen: landscape beside a panel, taller above a sheet. */
const stretch = () => (isCompact() ? { x: 0.95, y: 1.18 } : { x: 1.32, y: 0.92 })

/**
 * How far to stand so the whole constellation (plus its labels) fits in the
 * part of the screen the panel leaves free — exact frustum maths, per axis.
 */
function focusDistance(idx: number) {
  const t = graph.topics[idx]
  const inset = panelInset()
  const visW = Math.max(200, viewport.width - inset.x)
  const visH = Math.max(160, viewport.height - inset.y)
  const tan = Math.tan(((rig.camera?.fov ?? 50) * Math.PI) / 360)
  let halfW: number
  let halfH: number
  if (t.level === 0) {
    halfW = halfH = (getLayout().domainRadius.get(t.domain) ?? 30) * 1.02
  } else {
    const R = FOCUS_RADIUS[t.level]
    const st = stretch()
    halfW = R * st.x * OUTER_RING + R * 0.6 // + room for labels
    halfH = R * st.y * OUTER_RING + R * 0.38
  }
  const dW = (halfW * viewport.height) / (tan * visW)
  const dH = (halfH * viewport.height) / (tan * visH)
  return Math.max(dW, dH, 14)
}

function destinationFor(w: World, idx: number, previous = -1) {
  const look = w.basePosition(idx)
  const from = rig.position.clone().sub(rig.flight ? look : rig.target)
  if (from.lengthSq() > 1e-6) from.normalize()
  // Lean the arrival into the direction of travel, so going somewhere feels like moving forward.
  if (previous >= 0 && previous !== idx) {
    const travelled = look.clone().sub(w.basePosition(previous))
    if (travelled.lengthSq() > 1) from.addScaledVector(travelled.normalize().negate(), 0.35).normalize()
  }
  const s = new Spherical().setFromVector3(from.lengthSq() > 1e-6 ? from : new Vector3(0, 0.4, 1))
  s.radius = focusDistance(idx)
  s.phi = clamp(s.phi * 0.4 + 1.12 * 0.6, 0.8, 1.32)
  return { look, position: new Vector3().setFromSpherical(s).add(look) }
}

let arriveTimer: ReturnType<typeof setTimeout> | undefined

function travel(focusId: string | null, via: string, quiet = false) {
  const w = world
  if (!w || !rig.camera) return
  const store = useExplore.getState()
  clearTimeout(arriveTimer)
  if (store.route) useExplore.setState({ route: null })
  const inset = panelInset()

  if (!focusId) {
    const { look, position } = overviewPose(w)
    w.setFocus(-1)
    w.setRoute([])
    rig.shiftXT = 0
    rig.shiftYT = 0
    store.setTravelling(true)
    rig.flyTo(look, position, {
      onArrive: () => useExplore.getState().setTravelling(false),
    })
    store.say('Returning to the whole universe.')
    return
  }

  const idx = graph.idx(focusId)
  if (idx < 0) {
    // Not loaded yet: head towards its region while it streams in, then continue the journey.
    const region = universe.regionFor(focusId)
    if (!region) return
    const anchor = universe.anchors[universe.manifest?.regions.find((r) => r.id === region)?.domain ?? '']
    if (anchor) {
      const look = new Vector3(...anchor)
      const dir = rig.position.clone().sub(look).normalize()
      rig.flyTo(look, look.clone().addScaledVector(dir, (universe.domainRadius.get(region) ?? 60) * 2.6), { speed: 0.8 })
    }
    store.setTravelling(true)
    store.say('Charting that region of the universe…')
    universe.loadRegion(region).then(() => {
      if (useExplore.getState().focusId === focusId && graph.idx(focusId) >= 0) travel(focusId, 'search')
    })
    return
  }
  if (idx >= w.count) return
  lastFramed = { ...viewport }
  const topic = graph.topics[idx]
  const previous = w.focus
  const { look, position } = destinationFor(w, idx, quiet ? -1 : previous)
  const basis = { ...CameraRig.basisFor(position, look), stretch: stretch(), distance: position.distanceTo(look) }

  // The knowledge system responds before the camera moves.
  if (!quiet && via !== 'back') ripples.spawn(w.nodePosition(idx), w.size[idx], 0)
  w.setFocus(idx, basis)
  rig.shiftXT = inset.x / 2 / viewport.width
  rig.shiftYT = inset.y / 2 / viewport.height
  if (quiet) {
    // Re-framing after a resize: glide, no ceremony.
    rig.flyTo(look, position, { speed: 1.6 })
    return
  }
  store.setTravelling(true)
  store.say(`Travelling to ${topic.title}.`)

  const arrive = () => {
    const s = useExplore.getState()
    s.setTravelling(false)
    s.say(topic.level === 0 ? `${topic.title} — a domain of knowledge.` : `${topic.title} — ${levelName[topic.level].toLowerCase()} in ${graph.get(topic.domain)?.title ?? topic.domain}.`)
    const k = useKnowledge.getState()
    k.touch(topic.id)
    if (previous >= 0 && graph.edgeBetween(previous, idx) >= 0) k.addPath(graph.topics[previous].id, topic.id)
    ripples.spawn(w.basePosition(idx), w.size[idx], 1)
    arriveTimer = setTimeout(() => w.setRoute([]), 1800)
  }

  if (via === 'search' && !prefersReducedMotion()) {
    const fromId = previous >= 0 ? graph.topics[previous].id : null
    const route = journeyRoute(graph, fromId, focusId)
    const nodes = route.map((id) => graph.idx(id))
    const edges: number[] = []
    for (let k = 1; k < nodes.length; k++) edges.push(graph.edgeBetween(nodes[k - 1], nodes[k]))
    const waypoints = nodes.slice(fromId ? 1 : 0)
    if (waypoints.length >= 2) {
      const lookPoints = waypoints.map((i) => w.basePosition(i))
      const positions = waypoints.map((i, k) => {
        if (k === waypoints.length - 1) return position
        // Fly *past* intermediate regions, high enough to see where we are.
        const p = w.basePosition(i)
        const away = p.clone().sub(w.center).setY(0).normalize()
        const t = graph.topics[i]
        const lift = t.level === 0 ? 70 : t.level === 1 ? 42 : 30
        return p.add(away.multiplyScalar(lift * 0.6)).add(new Vector3(0, lift * 0.7, 0))
      })
      w.setRoute([])
      const lit = new Set<number>()
      const steps = edges.length
      const start = fromId ? 1 : 0
      const journey = { ids: route, reached: start }
      useExplore.setState({ route: journey })
      rig.flyRoute(lookPoints, positions, {
        onProgress: (t) => {
          for (let k = 0; k < steps; k++) {
            if (!lit.has(k) && t >= (k + 0.35) / (steps + 0.5)) {
              lit.add(k)
              if (edges[k] >= 0) {
                w.lightRouteEdge(edges[k])
                w.routeEdges.add(edges[k])
                useKnowledge.getState().addPath(route[k], route[k + 1])
              }
            }
          }
          const reached = Math.min(route.length - 1, start + lit.size)
          if (useExplore.getState().route === journey && journey.reached !== reached) {
            journey.reached = reached
            useExplore.setState({ route: { ...journey } })
          }
        },
        onArrive: () => {
          useExplore.setState({ route: { ids: route, reached: route.length } })
          const done = useExplore.getState().route
          setTimeout(() => useExplore.getState().route === done && useExplore.setState({ route: null }), 2600)
          arrive()
        },
      })
      return
    }
  }
  rig.flyTo(look, position, { onArrive: arrive })
}


/** Wire intent → choreography. Called once the canvas exists. */
export function startDirector() {
  if (engine.started) return
  engine.started = true
  const w = initWorld()

  useExplore.subscribe((s, prev) => {
    if (s.travelNonce !== prev.travelNonce) travel(s.focusId, s.via)
    if (s.hoverId !== prev.hoverId) w.setHover(s.hoverId ? graph.idx(s.hoverId) : -1)
    if (s.previewId !== prev.previewId) w.setPreview(s.previewId ? graph.idx(s.previewId) : -1)
    if (s.showMap !== prev.showMap) w.setMapLayer(s.showMap)
  })
  const syncKnowledge = () => {
    w.setKnowledge(knowledgeOf)
    w.setTravelled(useKnowledge.getState().paths)
  }
  syncKnowledge()
  useKnowledge.subscribe(syncKnowledge)
}

/** Opening shot: from deep space into the overview while the universe ignites. */
export function beginIntro() {
  const w = initWorld()
  const { look, position } = overviewPose(w)
  const start = position.clone().sub(look).multiplyScalar(2.6).add(look).add(new Vector3(0, 120, 0))
  rig.target.copy(look)
  rig.spherical.setFromVector3(start.clone().sub(look))
  if (rig.camera) rig.camera.position.copy(start)
  w.revealT = 1
  // The universe ignites from the core outward as the camera arrives.
  w.igniteAll(w.clock + 0.2, prefersReducedMotion() ? 0.6 : 4.2)
  // A destination chosen before the universe was ready (deep link, early click) wins over the overview.
  const pending = useExplore.getState().focusId
  if (pending) {
    travel(pending, 'search')
    return
  }
  rig.flyTo(look, position, { speed: prefersReducedMotion() ? 1 : 0.42 })
}

let reframeTimer: ReturnType<typeof setTimeout> | undefined
let lastFramed = { width: 0, height: 0 }

/** Called on resize: keep an active focus framed (and re-shaped) for the new screen. */
export function reframe() {
  const w = world
  if (!w || w.focus < 0 || !rig.camera) return
  const inset = panelInset()
  rig.shiftXT = inset.x / 2 / viewport.width
  rig.shiftYT = inset.y / 2 / viewport.height
  clearTimeout(reframeTimer)
  reframeTimer = setTimeout(() => {
    const changed = Math.abs(viewport.width - lastFramed.width) > 40 || Math.abs(viewport.height - lastFramed.height) > 40
    if (!changed || rig.busy || w.focus < 0) return
    lastFramed = { ...viewport }
    travel(graph.topics[w.focus].id, 'resize', true)
  }, 280)
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Dev-only handle for inspection from the console.
  ;(window as unknown as Record<string, unknown>).__uok = {
    rig,
    get world() {
      return world
    },
    viewport,
    graph,
    universe,
    explore: useExplore,
    settings: useSettings,
    /** Advance the simulation manually (useful when rAF is throttled). */
    step(seconds: number) {
      for (let t = 0; t < seconds; t += 1 / 30) {
        world?.update(1 / 30, (world?.clock ?? 0) + 1 / 30)
        rig.update(1 / 30, viewport)
      }
      // Make the next rendered frame upload everything the manual steps changed.
      if (world) world.posDirty = world.emphDirty = world.knownDirty = true
    },
  }
}
