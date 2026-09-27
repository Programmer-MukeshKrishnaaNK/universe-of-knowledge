import { Spherical, Vector3 } from 'three'
import { graph, getLayout } from '../graph'
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
    world = engine.world = new World(graph, getLayout())
    world.setKnowledge(knowledgeOf)
  }
  return world
}

const OVERVIEW_RADIUS = () => (isCompact() ? 340 : 245)

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

/** A route that follows the hierarchy: climb to a shared ancestor, then descend. */
function hierarchicalRoute(fromId: string | null, toId: string): string[] {
  const down = graph.lineage(toId).map((t) => t.id)
  if (!fromId) return down
  if (graph.edgeBetween(graph.idx(fromId), graph.idx(toId)) >= 0) return [fromId, toId]
  const up = graph.lineage(fromId).map((t) => t.id)
  let common = 0
  while (common < up.length && common < down.length && up[common] === down[common]) common++
  let route = [...up.slice(common > 0 ? common - 1 : 0).reverse(), ...down.slice(common)]
  if (common === 0) route = [...up.slice().reverse(), ...down]
  // Long routes skip intermediate climbs — keep the journey legible.
  if (route.length > 6) route = [route[0], ...route.slice(-5)]
  return route
}

let arriveTimer: ReturnType<typeof setTimeout> | undefined

function travel(focusId: string | null, via: string, quiet = false) {
  const w = world
  if (!w || !rig.camera) return
  const store = useExplore.getState()
  clearTimeout(arriveTimer)
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
  if (idx < 0) return
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
    s.say(`${topic.title} — ${levelName[topic.level].toLowerCase()} in ${graph.get(topic.domain)?.title ?? topic.domain}.`)
    useKnowledge.getState().touch(topic.id)
    ripples.spawn(w.basePosition(idx), w.size[idx], 1)
    arriveTimer = setTimeout(() => w.setRoute([]), 1800)
  }

  if (via === 'search' && !prefersReducedMotion()) {
    const fromId = previous >= 0 ? graph.topics[previous].id : null
    const route = hierarchicalRoute(fromId, focusId)
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
      rig.flyRoute(lookPoints, positions, {
        onProgress: (t) => {
          for (let k = 0; k < steps; k++) {
            if (edges[k] >= 0 && !lit.has(k) && t >= (k + 0.35) / (steps + 0.5)) {
              lit.add(k)
              w.lightRouteEdge(edges[k])
              w.routeEdges.add(edges[k])
            }
          }
        },
        onArrive: arrive,
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
  useKnowledge.subscribe(() => w.setKnowledge(knowledgeOf))
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
    explore: useExplore,
    /** Advance the simulation manually (useful when rAF is throttled). */
    step(seconds: number) {
      for (let t = 0; t < seconds; t += 1 / 30) {
        world?.update(1 / 30)
        rig.update(1 / 30, viewport)
      }
      // Make the next rendered frame upload everything the manual steps changed.
      if (world) world.posDirty = world.emphDirty = world.knownDirty = true
    },
  }
}
