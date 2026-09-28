import { Color, Vector3 } from 'three'
import { domainColor } from '../data'
import type { KnowledgeState } from '../data/schema'
import type { KnowledgeGraph } from '../knowledge/graph'
import { damp, springTo } from '../lib/motion'
import { EdgeField } from './edges'

export const NODE_SIZE = [3.1, 1.45, 0.82, 0.62]
const BASE_EMPH = [1, 0.86, 0.66, 0.56]
const KNOWN_CODE: Record<KnowledgeState, number> = {
  discovered: 1,
  learning: 2,
  understood: 3,
  review: 4,
  want_to_learn: 5,
}

/** Radius of the focus constellation, by level of the focused topic. */
export const FOCUS_RADIUS = [0, 12, 9.5, 9.5]
/** Constellation ring factor for crowded groups (outer ring). */
export const OUTER_RING = 1.34
/** Nodes that are not yet loaded are born "never". */
const UNBORN = 1e9

export interface ViewBasis {
  right: Vector3
  up: Vector3
  forward: Vector3
  /** Horizontal / vertical stretch of the constellation ellipse. */
  stretch?: { x: number; y: number }
  /** Camera distance at arrival — clearing works in screen angle, not world distance. */
  distance?: number
}

/**
 * All mutable per-node visual state, in typed arrays sized to the universe's
 * capacity and handed to the GPU as-is. Regions stream in by igniting their
 * slots (addNodes); nothing is reallocated as the universe grows.
 * Relationships live in an EdgeField: a budgeted, relevance-selected subset.
 * React never touches this per frame — scene components read it.
 */
export class World {
  readonly graph: KnowledgeGraph
  readonly capacity: number
  /** Nodes currently present (graph.size). */
  count = 0
  readonly base: Float32Array
  readonly pos: Float32Array
  readonly vel: Float32Array
  readonly target: Float32Array
  readonly color: Float32Array
  readonly size: Float32Array
  readonly level: Float32Array
  /** Clock time at which each node ignites. */
  readonly born: Float32Array
  readonly emph: Float32Array
  readonly emphT: Float32Array
  readonly hover: Float32Array
  readonly hoverT: Float32Array
  readonly focusAmt: Float32Array
  readonly known: Float32Array
  /** Hop distance from the focus (-1 = far). */
  readonly hop: Int8Array

  edges: EdgeField
  readonly center = new Vector3()

  focus = -1
  hoverIdx = -1
  previewIdx = -1
  routeEdges = new Set<number>()
  travelled = new Set<number>()
  /** 0..1 — global reveal during the intro (atmosphere follows it). */
  reveal = 0
  revealT = 0
  /** Seconds on the scene clock (kept in step by the driver). */
  clock = 0
  /** 0..1 — how much the scene recedes behind a focused topic. */
  dim = 0
  dimT = 0
  /** 0..1 — personal knowledge layer visibility. */
  mapLayer = 0
  mapLayerT = 0

  posDirty = true
  emphDirty = true
  knownDirty = true
  /** Bumped whenever nodes ignite — geometry-owning components rebuild lazily. */
  generation = 0
  /** What changed during the last update() — scene components upload only this. */
  changed = { pos: true, emph: true, known: true, born: true }
  private bornDirty = true
  private positionsOf: () => Float32Array

  constructor(graph: KnowledgeGraph, capacity: number, positions: () => Float32Array, center: [number, number, number], edgeBudget: number) {
    this.graph = graph
    this.capacity = capacity
    this.positionsOf = positions
    const n = capacity
    this.base = new Float32Array(n * 3)
    this.pos = new Float32Array(n * 3)
    this.vel = new Float32Array(n * 3)
    this.target = new Float32Array(n * 3)
    this.color = new Float32Array(n * 3)
    this.size = new Float32Array(n)
    this.level = new Float32Array(n)
    this.born = new Float32Array(n).fill(UNBORN)
    this.emph = new Float32Array(n)
    this.emphT = new Float32Array(n)
    this.hover = new Float32Array(n)
    this.hoverT = new Float32Array(n)
    this.focusAmt = new Float32Array(n)
    this.known = new Float32Array(n)
    this.hop = new Int8Array(n).fill(-1)
    this.center.set(...center)
    this.edges = new EdgeField(this, edgeBudget)
  }

  /** Ignite newly loaded nodes. `stagger` spreads their birth for a gentle reveal. */
  addNodes(indices: number[], stagger: number) {
    const g = this.graph
    const P = this.positionsOf()
    const c = new Color()
    const [cx, cy, cz] = [this.center.x, this.center.y, this.center.z]
    for (const i of indices) {
      if (i >= this.capacity) continue
      const t = g.topics[i]
      for (let k = 0; k < 3; k++) {
        this.base[i * 3 + k] = P[i * 3 + k]
        this.pos[i * 3 + k] = P[i * 3 + k]
        this.target[i * 3 + k] = P[i * 3 + k]
      }
      c.set(domainColor[t.domain] ?? '#cccccc').convertSRGBToLinear()
      this.color.set([c.r, c.g, c.b], i * 3)
      this.size[i] = NODE_SIZE[t.level] * (t.mapped === false ? 0.8 : 1)
      this.level[i] = t.level
      const d = Math.hypot(P[i * 3] - cx, P[i * 3 + 1] - cy, P[i * 3 + 2] - cz)
      // Domains ignite first, then knowledge spreads outward from the core.
      this.born[i] = this.clock + Math.min(0.85, t.level * 0.14 + d / 520 + ((i * 0.61803) % 1) * 0.06) * stagger
    }
    this.count = Math.min(this.capacity, g.size)
    this.generation++
    this.bornDirty = true
    this.recompute()
    this.emph.set(this.emphT.subarray(0, this.count), 0)
    this.posDirty = true
    this.edges.markSelectionDirty()
  }

  // ─── State changes ────────────────────────────────────────────────────

  setFocus(idx: number, basis?: ViewBasis) {
    this.focus = idx
    // The deeper the focus, the further the rest of the universe recedes.
    this.dimT = idx >= 0 ? 0.8 + this.graph.topics[idx].level * 0.1 : 0
    this.arrange(basis)
    this.recompute()
    this.edges.markSelectionDirty()
  }

  setHover(idx: number) {
    if (idx === this.hoverIdx) return
    this.hoverIdx = idx
    this.recompute()
    this.edges.markSelectionDirty()
  }

  setPreview(idx: number) {
    if (idx === this.previewIdx) return
    this.previewIdx = idx
    this.recompute()
    this.edges.markSelectionDirty()
  }

  setRoute(edges: number[]) {
    this.routeEdges = new Set(edges)
    this.recompute()
    this.edges.markSelectionDirty()
  }

  lightRouteEdge(e: number) {
    this.routeEdges.add(e)
    this.edges.light(e)
  }

  setKnowledge(lookup: (id: string) => KnowledgeState | undefined) {
    const g = this.graph
    for (let i = 0; i < this.count; i++) {
      const s = lookup(g.topics[i].id)
      this.known[i] = s ? KNOWN_CODE[s] : 0
    }
    this.knownDirty = true
  }

  /** Mark the connections this learner has travelled (keys are "a|b", sorted ids). */
  setTravelled(keys: string[]) {
    const g = this.graph
    this.travelled.clear()
    for (const key of keys) {
      const [a, b] = key.split('|')
      const e = g.edgeBetween(g.idx(a), g.idx(b))
      if (e >= 0) this.travelled.add(e)
    }
    this.edges.markStateDirty()
  }

  setMapLayer(on: boolean) {
    this.mapLayerT = on ? 1 : 0
  }

  /** Arrange the focused topic's neighbourhood into a readable constellation. */
  private arrange(basis?: ViewBasis) {
    const g = this.graph
    const n = this.count
    this.target.set(this.base.subarray(0, n * 3))
    const f = this.focus
    if (f < 0 || !basis) {
      this.posDirty = true
      return
    }
    const ft = g.topics[f]
    if (ft.level === 0) {
      this.posDirty = true
      return
    }
    const R = FOCUS_RADIUS[ft.level]
    const sx = basis.stretch?.x ?? 1.32
    const sy = basis.stretch?.y ?? 0.92
    const fx = this.base[f * 3], fy = this.base[f * 3 + 1], fz = this.base[f * 3 + 2]

    const taken = new Set<number>([f])
    const collect = (ids: string[], cap = 24) => {
      const out: number[] = []
      for (const id of ids) {
        const i = g.idx(id)
        if (i < 0 || i >= n || taken.has(i) || g.topics[i].level === 0) continue
        taken.add(i)
        out.push(i)
        if (out.length >= cap) break
      }
      return out
    }
    const prereq = collect(g.prerequisites(ft.id).map((t) => t.id))
    const parent = collect(ft.parent ? [ft.parent] : [])
    const deeper = collect(g.deeper(ft.id).map((t) => t.id))
    const related = collect(g.related(ft.id).map((t) => t.id), 16)

    const place = (group: number[], centerDeg: number, maxSpreadDeg: number, radius: number) => {
      const c = group.length
      const rings = c > 16 ? 3 : c > 5 ? 2 : 1
      group.forEach((i, k) => {
        const ring = k % rings
        const slot = Math.floor(k / rings)
        const slots = Math.ceil(c / rings)
        const spread = Math.min(maxSpreadDeg, 26 * (slots - 1))
        const a = ((centerDeg + (slots === 1 ? 0 : spread * (slot / (slots - 1) - 0.5)) + ring * 9) * Math.PI) / 180
        const r = radius * (1 + ring * (OUTER_RING - 1))
        // An ellipse shaped to the reading area (landscape beside the panel, taller above a sheet).
        const x = Math.cos(a) * r * sx
        const y = Math.sin(a) * r * sy
        const z = (k % 2 ? 1 : -1) * radius * 0.14
        const { right, up, forward } = basis
        this.target[i * 3] = fx + right.x * x + up.x * y + forward.x * z
        this.target[i * 3 + 1] = fy + right.y * x + up.y * y + forward.y * z
        this.target[i * 3 + 2] = fz + right.z * x + up.z * y + forward.z * z
      })
    }
    // Reading order: what comes before ← topic → what comes after.
    // Tall reading areas (compact screens) read top → bottom instead.
    if (sy > sx) {
      place(prereq, 90, 100, R)
      place(parent, 148, 0, R * 0.85)
      place(deeper, 270, 110, R)
      place(related, 0, 80, R * 1.05)
    } else {
      place(prereq, 180, 100, R)
      place(parent, 92, 0, R * 0.85)
      place(deeper, 0, 110, R)
      place(related, 270, 120, R * 1.05)
    }

    // Clear the stage: anything that would *appear* inside the constellation —
    // in front of it or far behind it — slides sideways in the view plane, so
    // nothing ever moves towards the camera. Measured in screen angle, because
    // a galaxy core far behind can cover the same pixels as a neighbour in front.
    const { forward, right } = basis
    const D = basis.distance ?? R * 4
    for (let i = 0; i < n; i++) {
      if (taken.has(i)) continue
      const dx = this.base[i * 3] - fx, dy = this.base[i * 3 + 1] - fy, dz = this.base[i * 3 + 2] - fz
      const along = dx * forward.x + dy * forward.y + dz * forward.z
      const isDomain = this.level[i] === 0
      if (along < -D * 0.92) continue // behind the camera
      if (along > (isDomain ? D * 3 : R * 2.5)) continue
      let lx = dx - forward.x * along, ly = dy - forward.y * along, lz = dz - forward.z * along
      const lat = Math.hypot(lx, ly, lz)
      const depth = Math.max(1, D + along)
      const need = (isDomain ? R * 2.3 : R * 1.75) * (depth / D)
      if (lat >= need) continue
      if (lat < 1e-3) {
        lx = right.x; ly = right.y; lz = right.z
      } else {
        lx /= lat; ly /= lat; lz /= lat
      }
      const push = (need - lat) * (isDomain || along < 0 ? 1 : 0.7)
      this.target[i * 3] += lx * push
      this.target[i * 3 + 1] += ly * push
      this.target[i * 3 + 2] += lz * push
    }
    this.posDirty = true
  }

  /** Derive target emphasis for every node from focus / hover / preview. */
  private recompute() {
    const g = this.graph
    const n = this.count
    const f = this.focus
    const hop = this.hop

    hop.fill(-1, 0, n)
    if (f >= 0 && f < n) {
      hop[f] = 0
      const first = g.neighbors(f)
      for (const j of first) hop[j] = 1
      for (const j of first) for (const k of g.neighbors(j)) if (hop[k] < 0) hop[k] = 2
    }
    const fDomain = f >= 0 ? g.topics[f].domain : null
    const quiet = f >= 0 ? [0.14, 0.12, 0.1, 0.075][g.topics[f].level] : 0

    // In dense universes the multitude of deep concepts steps back, so fields and clusters carry the structure.
    const density = Math.min(1, Math.max(0, (n - 500) / 5000))
    const levelGain = [1, 1, 1 + 0.15 * density, 1 - 0.5 * density]
    for (let i = 0; i < n; i++) {
      const t = g.topics[i]
      let e = BASE_EMPH[t.level] * levelGain[t.level] * (t.mapped === false ? 0.62 : 1)
      if (f >= 0) {
        e = hop[i] === 0 ? 1 : hop[i] === 1 ? 0.96 : hop[i] === 2 ? 0.36 : t.domain === fDomain ? quiet * 2 : quiet
        // Unrelated galaxy cores stay as faint landmarks — they must never outshine the focus.
        if (t.level === 0) e = hop[i] >= 0 && hop[i] <= 1 ? Math.max(e, 0.5) : Math.max(e, 0.16)
      }
      this.emphT[i] = e
    }

    const accent = (h: number, strength: number) => {
      if (h < 0) return
      this.emphT[h] = Math.max(this.emphT[h], 1)
      for (const e of g.adj[h]) {
        const o = g.other(e, h)
        this.emphT[o] = Math.max(this.emphT[o], 0.82 * strength)
      }
    }
    if (this.hoverIdx >= 0 && this.hoverIdx !== f) {
      // Everything else recedes very slightly so the hovered cluster reads.
      if (f < 0) for (let i = 0; i < n; i++) this.emphT[i] *= 0.72
      accent(this.hoverIdx, 1)
    }
    if (this.previewIdx >= 0 && this.previewIdx !== f) accent(this.previewIdx, 0.9)

    this.hoverT.fill(0, 0, n)
    if (this.hoverIdx >= 0) this.hoverT[this.hoverIdx] = 1
    if (this.previewIdx >= 0) this.hoverT[this.previewIdx] = 1
    this.emphDirty = true
    this.edges.markStateDirty()
  }

  /** Target emphasis / flow for one relationship under the current focus, hover and route. */
  edgeTarget(e: number): [number, number] {
    const g = this.graph
    const s = g.edgeSource[e], t = g.edgeTarget[e], type = g.edgeType[e]
    const f = this.focus
    let v: number
    let flow = 0
    if (f < 0) {
      const topLevel = Math.min(this.level[s], this.level[t])
      v = type === 0 ? (topLevel === 0 ? 0.3 : 0.2) : type === 1 ? 0.05 : type === 3 ? 0.055 : 0.03
    } else if (s === f || t === f) {
      v = 1
      flow = 1
    } else {
      const hs = this.hop[s], ht = this.hop[t]
      if (hs === 1 && ht === 1) v = 0.2
      else if (hs >= 0 && ht >= 0 && hs + ht <= 3) v = 0.06
      else v = type === 0 ? 0.035 : 0.012
    }
    for (const [h, strength] of [
      [this.hoverIdx, 1],
      [this.previewIdx, 0.9],
    ] as const) {
      if (h < 0 || h === f) continue
      if (h === s || h === t) {
        v = Math.max(v, 0.78 * strength)
        flow = Math.max(flow, 0.55 * strength)
      } else if (f < 0 && h === this.hoverIdx) v *= 0.6
    }
    if (this.routeEdges.has(e)) v = Math.max(v, 0.9)
    return [v, flow]
  }

  // ─── Simulation ───────────────────────────────────────────────────────

  update(dt: number, clock: number) {
    dt = Math.min(dt, 1 / 20)
    this.clock = clock
    this.changed.pos = this.posDirty
    this.changed.emph = this.emphDirty
    this.changed.known = this.knownDirty
    this.changed.born = this.bornDirty
    this.knownDirty = false
    this.bornDirty = false
    this.reveal = damp(this.reveal, this.revealT, 0.9, dt)
    this.dim = damp(this.dim, this.dimT, 2.2, dt)
    this.mapLayer = damp(this.mapLayer, this.mapLayerT, 4, dt)
    const n = this.count

    if (this.posDirty) {
      let moving = false
      for (let k = 0; k < n * 3; k++) {
        springTo(this.pos, k, this.vel, this.target[k], 3.1, dt)
        if (!moving && (Math.abs(this.pos[k] - this.target[k]) > 1e-3 || Math.abs(this.vel[k]) > 1e-3)) moving = true
      }
      if (!moving) this.posDirty = false
    }

    if (this.emphDirty) {
      let moving = false
      const ke = 1 - Math.exp(-5 * dt)
      const kh = 1 - Math.exp(-9 * dt)
      const kf = 1 - Math.exp(-3 * dt)
      for (let i = 0; i < n; i++) {
        this.emph[i] += (this.emphT[i] - this.emph[i]) * ke
        this.hover[i] += (this.hoverT[i] - this.hover[i]) * kh
        const ft = i === this.focus ? 1 : 0
        this.focusAmt[i] += (ft - this.focusAmt[i]) * kf
        if (!moving && (Math.abs(this.emph[i] - this.emphT[i]) > 1e-3 || Math.abs(this.hover[i] - this.hoverT[i]) > 1e-3 || Math.abs(this.focusAmt[i] - ft) > 1e-3)) moving = true
      }
      if (!moving) this.emphDirty = false
    }
    this.edges.update(dt)
  }

  /** On-screen size of a node, matching the node shader (the focus is enlarged). */
  visualSize(i: number) {
    const s = this.size[i]
    return s + (Math.max(s * 1.3, 1.85) - s) * this.focusAmt[i]
  }

  /** Is this node visible yet (loaded and ignited)? */
  alive(i: number) {
    return i < this.count && this.born[i] <= this.clock + 0.2
  }

  nodePosition(i: number, out = new Vector3()) {
    return out.set(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2])
  }

  basePosition(i: number, out = new Vector3()) {
    return out.set(this.base[i * 3], this.base[i * 3 + 1], this.base[i * 3 + 2])
  }

  /** Re-time births (used by the intro so the universe ignites as the camera arrives). */
  igniteAll(from: number, span: number) {
    const [cx, cy, cz] = [this.center.x, this.center.y, this.center.z]
    for (let i = 0; i < this.count; i++) {
      const d = Math.hypot(this.base[i * 3] - cx, this.base[i * 3 + 1] - cy, this.base[i * 3 + 2] - cz)
      this.born[i] = from + Math.min(0.85, this.level[i] * 0.14 + d / 520 + ((i * 0.61803) % 1) * 0.06) * span
    }
    this.bornDirty = true
  }
}
