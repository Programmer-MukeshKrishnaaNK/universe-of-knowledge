import { Color, Vector3 } from 'three'
import { domainColor } from '../data'
import type { KnowledgeState } from '../data/schema'
import type { KnowledgeGraph } from '../graph/buildGraph'
import type { Layout } from '../graph/layout'
import { damp, springTo } from '../lib/motion'

/** Edge curves are sampled at this many segments. */
export const EDGE_SEGMENTS = 22

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

export interface ViewBasis {
  right: Vector3
  up: Vector3
  forward: Vector3
  /** Horizontal / vertical stretch of the constellation ellipse. */
  stretch?: { x: number; y: number }
}

/**
 * All mutable per-node / per-edge visual state, in typed arrays that are
 * handed to the GPU as-is (the arrays *are* the attribute buffers).
 * React never touches this per frame — the scene components read it.
 */
export class World {
  readonly graph: KnowledgeGraph
  readonly n: number
  readonly m: number
  readonly base: Float32Array
  readonly pos: Float32Array
  readonly vel: Float32Array
  readonly target: Float32Array
  readonly color: Float32Array
  readonly size: Float32Array
  readonly level: Float32Array
  readonly delay: Float32Array
  readonly emph: Float32Array
  readonly emphT: Float32Array
  readonly hover: Float32Array
  readonly hoverT: Float32Array
  readonly focusAmt: Float32Array
  readonly known: Float32Array

  readonly edgeEmph: Float32Array
  readonly edgeEmphT: Float32Array
  readonly edgeFlow: Float32Array
  readonly edgeFlowT: Float32Array
  /** Per-vertex buffers for the edge geometry. */
  readonly edgeVerts: Float32Array
  readonly edgeVertEmph: Float32Array
  readonly edgeVertFlow: Float32Array
  readonly edgeVertColor: Float32Array
  readonly edgeVertT: Float32Array
  readonly edgeVertKind: Float32Array
  readonly edgeVertLen: Float32Array

  readonly layout: Layout
  readonly center: Vector3

  focus = -1
  hoverIdx = -1
  previewIdx = -1
  routeEdges = new Set<number>()
  /** 0..1 — global reveal during the intro. */
  reveal = 0
  revealT = 0
  /** 0..1 — how much the scene recedes behind a focused topic. */
  dim = 0
  dimT = 0
  /** 0..1 — personal knowledge layer visibility. */
  mapLayer = 0
  mapLayerT = 0

  posDirty = true
  emphDirty = true
  /** What changed during the last update() — scene components upload only this. */
  changed = { pos: true, emph: true, known: true }
  edgeDirty = true
  knownDirty = true

  constructor(graph: KnowledgeGraph, layout: Layout) {
    this.graph = graph
    this.layout = layout
    const n = (this.n = graph.size)
    const m = (this.m = graph.edgeSource.length)
    this.base = layout.positions
    this.pos = new Float32Array(layout.positions)
    this.vel = new Float32Array(n * 3)
    this.target = new Float32Array(layout.positions)
    this.color = new Float32Array(n * 3)
    this.size = new Float32Array(n)
    this.level = new Float32Array(n)
    this.delay = new Float32Array(n)
    this.emph = new Float32Array(n)
    this.emphT = new Float32Array(n)
    this.hover = new Float32Array(n)
    this.hoverT = new Float32Array(n)
    this.focusAmt = new Float32Array(n)
    this.known = new Float32Array(n)
    this.center = new Vector3(...layout.center)

    const c = new Color()
    graph.topics.forEach((t, i) => {
      c.set(domainColor[t.domain]).convertSRGBToLinear()
      this.color.set([c.r, c.g, c.b], i * 3)
      this.size[i] = NODE_SIZE[t.level] * (t.mapped === false ? 0.8 : 1)
      this.level[i] = t.level
      // Reveal: domains ignite first, then knowledge spreads outward.
      const dx = this.base[i * 3] - layout.center[0]
      const dy = this.base[i * 3 + 1] - layout.center[1]
      const dz = this.base[i * 3 + 2] - layout.center[2]
      this.delay[i] = Math.min(0.85, t.level * 0.14 + Math.hypot(dx, dy, dz) / 520 + ((i * 0.61803) % 1) * 0.06)
    })

    this.edgeEmph = new Float32Array(m)
    this.edgeEmphT = new Float32Array(m)
    this.edgeFlow = new Float32Array(m)
    this.edgeFlowT = new Float32Array(m)
    const vpe = EDGE_SEGMENTS + 1
    this.edgeVerts = new Float32Array(m * vpe * 3)
    this.edgeVertEmph = new Float32Array(m * vpe)
    this.edgeVertFlow = new Float32Array(m * vpe)
    this.edgeVertColor = new Float32Array(m * vpe * 3)
    this.edgeVertT = new Float32Array(m * vpe)
    this.edgeVertKind = new Float32Array(m * vpe)
    this.edgeVertLen = new Float32Array(m * vpe)
    for (let e = 0; e < m; e++) {
      const s = graph.edgeSource[e], t = graph.edgeTarget[e]
      for (let k = 0; k < vpe; k++) {
        const v = e * vpe + k
        const f = k / EDGE_SEGMENTS
        this.edgeVertT[v] = f
        this.edgeVertKind[v] = graph.edgeType[e]
        // Cross-domain edges blend their two colours along their length.
        for (let ch = 0; ch < 3; ch++) this.edgeVertColor[v * 3 + ch] = this.color[s * 3 + ch] * (1 - f) + this.color[t * 3 + ch] * f
      }
    }
    this.recompute()
    this.emph.set(this.emphT)
    this.edgeEmph.set(this.edgeEmphT)
    this.writeEdgeGeometry()
  }

  // ─── State changes ────────────────────────────────────────────────────

  setFocus(idx: number, basis?: ViewBasis) {
    this.focus = idx
    this.dimT = idx >= 0 ? 1 : 0
    this.arrange(basis)
    this.recompute()
  }

  setHover(idx: number) {
    if (idx === this.hoverIdx) return
    this.hoverIdx = idx
    this.recompute()
  }

  setPreview(idx: number) {
    if (idx === this.previewIdx) return
    this.previewIdx = idx
    this.recompute()
  }

  setRoute(edges: number[]) {
    this.routeEdges = new Set(edges)
    this.recompute()
  }

  lightRouteEdge(e: number) {
    this.edgeEmphT[e] = 1
    this.edgeFlowT[e] = 1
    this.emphDirty = true
  }

  setKnowledge(lookup: (id: string) => KnowledgeState | undefined) {
    this.graph.topics.forEach((t, i) => {
      const s = lookup(t.id)
      this.known[i] = s ? KNOWN_CODE[s] : 0
    })
    this.knownDirty = true
  }

  setMapLayer(on: boolean) {
    this.mapLayerT = on ? 1 : 0
  }

  /** Arrange the focused topic's neighbourhood into a readable constellation. */
  private arrange(basis?: ViewBasis) {
    const g = this.graph
    this.target.set(this.base)
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
    const collect = (ids: string[]) => {
      const out: number[] = []
      for (const id of ids) {
        const i = g.idx(id)
        if (i < 0 || taken.has(i) || g.topics[i].level === 0) continue
        taken.add(i)
        out.push(i)
      }
      return out
    }
    const prereq = collect(g.prerequisites(ft.id).map((t) => t.id))
    const parent = collect(ft.parent ? [ft.parent] : [])
    const deeper = collect(g.deeper(ft.id).map((t) => t.id))
    const related = collect(g.related(ft.id).map((t) => t.id))

    const place = (group: number[], centerDeg: number, maxSpreadDeg: number, radius: number) => {
      const c = group.length
      const twoRings = c > 5
      group.forEach((i, k) => {
        const ring = twoRings ? k % 2 : 0
        const slot = twoRings ? Math.floor(k / 2) : k
        const slots = twoRings ? Math.ceil(c / 2) : c
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

    // Clear the stage: anything crowding the line of sight slides sideways,
    // in the view plane, so it can never drift towards the camera.
    // Domain cores are included — a galaxy's heart must not eclipse the focus.
    const { forward, right } = basis
    const clear = R * 2.3
    for (let i = 0; i < this.n; i++) {
      if (taken.has(i)) continue
      const dx = this.base[i * 3] - fx, dy = this.base[i * 3 + 1] - fy, dz = this.base[i * 3 + 2] - fz
      const along = dx * forward.x + dy * forward.y + dz * forward.z
      // Lateral offset from the camera→focus axis.
      let lx = dx - forward.x * along, ly = dy - forward.y * along, lz = dz - forward.z * along
      const lat = Math.hypot(lx, ly, lz)
      const inFront = along < 0
      const isDomain = g.topics[i].level === 0
      // Only nodes near the axis between camera and focus, or close behind it, matter.
      if (along > R * 2.5 || (inFront && -along > R * 4.5)) continue
      const reach = isDomain ? clear * 1.3 : clear
      if (lat > reach) continue
      if (lat < 1e-3) {
        lx = right.x; ly = right.y; lz = right.z
      } else {
        lx /= lat; ly /= lat; lz /= lat
      }
      const push = (reach - lat) * (isDomain || inFront ? 0.9 : 0.6)
      this.target[i * 3] += lx * push
      this.target[i * 3 + 1] += ly * push
      this.target[i * 3 + 2] += lz * push
    }
    this.posDirty = true
  }

  /** Derive target emphasis for every node and edge from focus / hover / route. */
  private recompute() {
    const g = this.graph
    const n = this.n
    const f = this.focus

    const hop = new Int8Array(n).fill(-1)
    if (f >= 0) {
      hop[f] = 0
      for (const j of g.neighbors(f)) hop[j] = 1
      for (let i = 0; i < n; i++) if (hop[i] === 1) for (const j of g.neighbors(i)) if (hop[j] < 0) hop[j] = 2
    }
    const fDomain = f >= 0 ? g.topics[f].domain : null

    for (let i = 0; i < n; i++) {
      const t = g.topics[i]
      let e = BASE_EMPH[t.level] * (t.mapped === false ? 0.62 : 1)
      if (f >= 0) {
        e = hop[i] === 0 ? 1 : hop[i] === 1 ? 0.96 : hop[i] === 2 ? 0.36 : t.domain === fDomain ? 0.2 : 0.1
        if (t.level === 0) e = Math.max(e, 0.4)
      }
      this.emphT[i] = e
    }

    for (let e = 0; e < this.m; e++) {
      const s = g.edgeSource[e], t = g.edgeTarget[e], type = g.edgeType[e]
      let v: number
      let flow = 0
      if (f < 0) {
        const topLevel = Math.min(g.topics[s].level, g.topics[t].level)
        v = type === 0 ? (topLevel === 0 ? 0.3 : 0.2) : type === 1 ? 0.085 : type === 3 ? 0.11 : 0.055
      } else if (s === f || t === f) {
        v = 1
        flow = 1
      } else if (hop[s] === 1 && hop[t] === 1) v = 0.2
      else if (hop[s] >= 0 && hop[t] >= 0 && hop[s] + hop[t] <= 3) v = 0.06
      else v = type === 0 ? 0.035 : 0.012
      this.edgeEmphT[e] = v
      this.edgeFlowT[e] = flow
    }

    const accent = (h: number, strength: number) => {
      if (h < 0) return
      this.emphT[h] = Math.max(this.emphT[h], 1)
      for (const e of g.adj[h]) {
        const o = g.other(e, h)
        this.emphT[o] = Math.max(this.emphT[o], 0.82 * strength)
        this.edgeEmphT[e] = Math.max(this.edgeEmphT[e], 0.78 * strength)
        this.edgeFlowT[e] = Math.max(this.edgeFlowT[e], 0.55 * strength)
      }
    }
    if (this.hoverIdx >= 0 && this.hoverIdx !== f) {
      if (f < 0) {
        // Everything else recedes very slightly so the hovered cluster reads.
        for (let i = 0; i < n; i++) this.emphT[i] *= 0.72
        for (let e = 0; e < this.m; e++) this.edgeEmphT[e] *= 0.6
      }
      accent(this.hoverIdx, 1)
    }
    if (this.previewIdx >= 0 && this.previewIdx !== f) accent(this.previewIdx, 0.9)
    for (const e of this.routeEdges) {
      this.edgeEmphT[e] = Math.max(this.edgeEmphT[e], 0.9)
    }

    for (let i = 0; i < n; i++) this.hoverT[i] = i === this.hoverIdx || i === this.previewIdx ? 1 : 0
    this.emphDirty = true
  }

  // ─── Simulation ───────────────────────────────────────────────────────

  update(dt: number) {
    dt = Math.min(dt, 1 / 20)
    this.changed.pos = this.posDirty
    this.changed.emph = this.emphDirty
    this.changed.known = this.knownDirty
    this.knownDirty = false
    this.reveal = damp(this.reveal, this.revealT, 0.9, dt)
    this.dim = damp(this.dim, this.dimT, 2.2, dt)
    this.mapLayer = damp(this.mapLayer, this.mapLayerT, 4, dt)

    if (this.posDirty) {
      let moving = false
      for (let k = 0; k < this.n * 3; k++) {
        springTo(this.pos, k, this.vel, this.target[k], 3.1, dt)
        if (Math.abs(this.pos[k] - this.target[k]) > 1e-3 || Math.abs(this.vel[k]) > 1e-3) moving = true
      }
      this.edgeDirty = true
      if (!moving) this.posDirty = false
    }

    if (this.emphDirty) {
      let moving = false
      for (let i = 0; i < this.n; i++) {
        this.emph[i] = damp(this.emph[i], this.emphT[i], 5, dt)
        this.hover[i] = damp(this.hover[i], this.hoverT[i], 9, dt)
        this.focusAmt[i] = damp(this.focusAmt[i], i === this.focus ? 1 : 0, 3, dt)
        if (Math.abs(this.emph[i] - this.emphT[i]) > 1e-3 || Math.abs(this.hover[i] - this.hoverT[i]) > 1e-3) moving = true
        if (Math.abs(this.focusAmt[i] - (i === this.focus ? 1 : 0)) > 1e-3) moving = true
      }
      for (let e = 0; e < this.m; e++) {
        this.edgeEmph[e] = damp(this.edgeEmph[e], this.edgeEmphT[e], 4, dt)
        this.edgeFlow[e] = damp(this.edgeFlow[e], this.edgeFlowT[e], 3, dt)
        if (Math.abs(this.edgeEmph[e] - this.edgeEmphT[e]) > 1e-3 || Math.abs(this.edgeFlow[e] - this.edgeFlowT[e]) > 1e-3) moving = true
      }
      this.edgeDirty = true
      if (!moving) this.emphDirty = false
    }
  }

  /** Rebuild edge curves (quadratic Béziers bowed away from the universe core). */
  writeEdgeGeometry() {
    const g = this.graph
    const vpe = EDGE_SEGMENTS + 1
    const P = this.pos
    const [cx, cy, cz] = this.layout.center
    for (let e = 0; e < this.m; e++) {
      const s = g.edgeSource[e], t = g.edgeTarget[e]
      const ax = P[s * 3], ay = P[s * 3 + 1], az = P[s * 3 + 2]
      const bx = P[t * 3], by = P[t * 3 + 1], bz = P[t * 3 + 2]
      const mx = (ax + bx) / 2, my = (ay + by) / 2, mz = (az + bz) / 2
      let dx = bx - ax, dy = by - ay, dz = bz - az
      const len = Math.hypot(dx, dy, dz) || 1
      dx /= len; dy /= len; dz /= len
      // Bow direction: away from the core, orthogonal to the edge.
      let ox = mx - cx, oy = my - cy + 12, oz = mz - cz
      const dot = ox * dx + oy * dy + oz * dz
      ox -= dx * dot; oy -= dy * dot; oz -= dz * dot
      const ol = Math.hypot(ox, oy, oz) || 1
      const type = g.edgeType[e]
      const bow = len * (type === 0 ? 0.07 : type === 1 ? 0.14 : 0.2)
      const qx = mx + (ox / ol) * bow, qy = my + (oy / ol) * bow, qz = mz + (oz / ol) * bow
      const em = this.edgeEmph[e]
      const fl = this.edgeFlow[e]
      for (let k = 0; k < vpe; k++) {
        const u = k / EDGE_SEGMENTS
        const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u
        const v = e * vpe + k
        this.edgeVerts[v * 3] = a * ax + b * qx + c * bx
        this.edgeVerts[v * 3 + 1] = a * ay + b * qy + c * by
        this.edgeVerts[v * 3 + 2] = a * az + b * qz + c * bz
        this.edgeVertEmph[v] = em
        this.edgeVertFlow[v] = fl
        this.edgeVertLen[v] = len
      }
    }
    this.edgeDirty = false
  }

  nodePosition(i: number, out = new Vector3()) {
    return out.set(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2])
  }

  basePosition(i: number, out = new Vector3()) {
    return out.set(this.base[i * 3], this.base[i * 3 + 1], this.base[i * 3 + 2])
  }
}
