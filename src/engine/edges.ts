import { prefersReducedMotion } from '../lib/motion'
import type { World } from './world'

/** Texture width for per-slot edge data (2 texels per slot). */
export const EDGE_TEX_WIDTH = 2048

const TYPE_SCORE = [3, 2.5, 1.4, 2.1, 1.6, 1, 2, 1.8] // by relation code

/**
 * The relationships actually drawn.
 *
 * A 50,000-concept universe has well over 100,000 relationships; drawing all
 * of them is both slow and noise. The EdgeField keeps a fixed budget of slots
 * (set by the quality mode) and fills them by relevance:
 *
 *   1. the focus, hover, preview and any journey route        — always
 *   2. relationships among the focus's neighbours
 *   3. the top of the hierarchy (domain → field)
 *   4. what is near the camera, by type, strength and distance
 *   5. the strongest bridges between domains
 *
 * Each slot's state (endpoints, type, emphasis, flow, draw-on progress,
 * travelled) lives in one float texture. The GPU computes the curves itself
 * from a node-position texture, so the CPU never rebuilds edge geometry.
 * Edges entering the set fade in from zero; edges leaving simply stop being
 * drawn once their slot is reused (they have faded by then in practice).
 */
export class EdgeField {
  readonly capacity: number
  slots: Int32Array
  count = 0
  private slotOf = new Map<number, number>()
  readonly emph: Float32Array
  readonly emphT: Float32Array
  readonly flow: Float32Array
  readonly flowT: Float32Array
  readonly grow: Float32Array
  readonly growDir: Float32Array
  /** Packed texture data: [src, tgt, type, cross] [emph, flow, grow, travelled] per slot. */
  readonly data: Float32Array
  selectionDirty = true
  stateDirty = true
  /** Set when data changed this frame (the renderer uploads the texture). */
  uploaded = false
  private bridgeCache: { version: number; list: number[] } = { version: -1, list: [] }

  constructor(
    private world: World,
    capacity: number,
  ) {
    this.capacity = capacity
    this.slots = new Int32Array(capacity).fill(-1)
    this.emph = new Float32Array(capacity)
    this.emphT = new Float32Array(capacity)
    this.flow = new Float32Array(capacity)
    this.flowT = new Float32Array(capacity)
    this.grow = new Float32Array(capacity).fill(1)
    this.growDir = new Float32Array(capacity).fill(1)
    const rows = Math.ceil((capacity * 2) / EDGE_TEX_WIDTH)
    this.data = new Float32Array(EDGE_TEX_WIDTH * rows * 4)
  }

  markSelectionDirty() {
    this.selectionDirty = true
  }

  markStateDirty() {
    this.stateDirty = true
  }

  /** Make sure an edge is drawn (e.g. a journey route) and light it fully. */
  light(e: number) {
    let s = this.slotOf.get(e)
    if (s === undefined) {
      if (this.count >= this.capacity) return
      s = this.count++
      this.assign(s, e, 0)
    }
    this.emphT[s] = 1
    this.flowT[s] = 1
    this.stateDirty = true
  }

  /**
   * Choose which relationships to draw, given where the camera is looking.
   * Called when the focus / hover / route changes, when regions load, and
   * periodically as the camera moves.
   */
  select(look: { x: number; y: number; z: number }, cameraDistance: number, spatialQuery: (x: number, y: number, z: number, r: number, visit: (i: number, d2: number) => void) => void) {
    const w = this.world
    const g = w.graph
    const total = g.edgeCount
    const chosen: number[] = []
    const seen = new Set<number>()
    const add = (e: number) => {
      if (chosen.length >= this.capacity || seen.has(e)) return
      const s = g.edgeSource[e], t = g.edgeTarget[e]
      if (s >= w.count || t >= w.count) return
      seen.add(e)
      chosen.push(e)
    }

    if (total <= this.capacity) {
      // The whole universe fits the budget — draw everything (the curated universe).
      for (let e = 0; e < total; e++) add(e)
    } else {
      for (const x of [w.focus, w.hoverIdx, w.previewIdx]) if (x >= 0) for (const e of g.adj[x]) add(e)
      for (const e of w.routeEdges) add(e)
      if (w.focus >= 0) {
        for (const e0 of g.adj[w.focus]) {
          const j = g.other(e0, w.focus)
          for (const e of g.adj[j]) if (w.hop[g.other(e, j)] === 1) add(e)
        }
      }
      // Top of the hierarchy: domain → field.
      for (const d of g.byDomain.keys()) {
        const di = g.idx(d)
        if (di >= 0) for (const e of g.adj[di]) if (g.edgeType[e] === 0) add(e)
      }
      // Near the camera: score by type, strength, level and distance.
      const reserveForBridges = Math.min(120, Math.floor(this.capacity * 0.03))
      const localBudget = this.capacity - chosen.length - reserveForBridges
      if (localBudget > 0) {
        const R = Math.max(40, Math.min(900, cameraDistance * 1.1))
        const cand: number[] = []
        const score: number[] = []
        let visited = 0
        spatialQuery(look.x, look.y, look.z, R, (i, d2) => {
          if (visited++ > 12000) return
          const near = 1 - Math.sqrt(d2) / R
          for (const e of g.adj[i]) {
            if (seen.has(e)) continue
            const lvl = Math.min(w.level[g.edgeSource[e]], w.level[g.edgeTarget[e]])
            cand.push(e)
            score.push(TYPE_SCORE[g.edgeType[e]] + g.edgeStrength[e] + (lvl <= 1 ? 1.2 : lvl === 2 ? 0.5 : 0) + near * 2.5 + (g.edgeCross[e] ? 0.4 : 0))
          }
        })
        const order = cand.map((_, k) => k).sort((a, b) => score[b] - score[a])
        for (const k of order) {
          if (chosen.length >= this.capacity - reserveForBridges) break
          add(cand[k])
        }
      }
      for (const e of this.strongestBridges()) add(e)
    }

    // Keep continuity: edges already drawn keep their slot and their current emphasis.
    const next = new Int32Array(this.capacity).fill(-1)
    const nextEmph = new Float32Array(this.capacity)
    const nextFlow = new Float32Array(this.capacity)
    const nextGrow = new Float32Array(this.capacity).fill(1)
    const nextDir = new Float32Array(this.capacity).fill(1)
    const nextSlotOf = new Map<number, number>()
    chosen.forEach((e, s) => {
      next[s] = e
      nextSlotOf.set(e, s)
      const old = this.slotOf.get(e)
      if (old !== undefined) {
        nextEmph[s] = this.emph[old]
        nextFlow[s] = this.flow[old]
        nextGrow[s] = this.grow[old]
        nextDir[s] = this.growDir[old]
      }
    })
    this.slots = next
    this.slotOf = nextSlotOf
    this.emph.set(nextEmph)
    this.flow.set(nextFlow)
    this.grow.set(nextGrow)
    this.growDir.set(nextDir)
    this.count = chosen.length
    for (let s = 0; s < this.count; s++) this.assign(s, this.slots[s], this.emph[s])
    this.selectionDirty = false
    this.stateDirty = true
  }

  private assign(s: number, e: number, emph: number) {
    const g = this.world.graph
    this.slots[s] = e
    this.slotOf.set(e, s)
    this.emph[s] = emph
    const d = this.data
    d[s * 8] = g.edgeSource[e]
    d[s * 8 + 1] = g.edgeTarget[e]
    d[s * 8 + 2] = g.edgeType[e]
    d[s * 8 + 3] = g.edgeCross[e]
  }

  /** The strongest cross-domain relationships in the universe (cached per graph version). */
  private strongestBridges(): number[] {
    const g = this.world.graph
    if (this.bridgeCache.version === g.version) return this.bridgeCache.list
    const list: number[] = []
    for (let e = 0; e < g.edgeCount; e++) if (g.edgeCross[e]) list.push(e)
    list.sort((a, b) => g.edgeStrength[b] - g.edgeStrength[a])
    this.bridgeCache = { version: g.version, list: list.slice(0, 120) }
    return this.bridgeCache.list
  }

  /** Retarget emphasis for every drawn slot and start draw-on for waking edges. */
  private retarget() {
    const w = this.world
    const g = w.graph
    const origins = [w.focus, w.hoverIdx, w.previewIdx].filter((x) => x >= 0)
    const instant = prefersReducedMotion()
    // Dense views dim every relationship a little, so thousands never become a glare.
    const density = Math.min(1, Math.max(0.35, Math.sqrt(500 / Math.max(500, this.count))))
    for (let s = 0; s < this.count; s++) {
      const e = this.slots[s]
      const [v, f] = w.edgeTarget(e)
      const vt = v >= 0.5 ? v : v * density
      if (vt >= 0.5 && this.emph[s] <= 0.35) {
        const src = g.edgeSource[e], tgt = g.edgeTarget[e]
        const origin = origins.find((o) => o === src || o === tgt)
        this.growDir[s] = origin === undefined || origin === src ? 1 : -1
        this.grow[s] = instant ? 1 : 0
      }
      this.emphT[s] = vt
      this.flowT[s] = f
    }
    this.stateDirty = false
  }

  update(dt: number) {
    if (this.stateDirty) this.retarget()
    const ke = 1 - Math.exp(-4 * dt)
    const kf = 1 - Math.exp(-3 * dt)
    const d = this.data
    const travelled = this.world.travelled
    let changed = false
    for (let s = 0; s < this.count; s++) {
      const de = this.emphT[s] - this.emph[s]
      const df = this.flowT[s] - this.flow[s]
      if (Math.abs(de) > 1e-4 || Math.abs(df) > 1e-4 || this.grow[s] < 1) changed = true
      this.emph[s] += de * ke
      this.flow[s] += df * kf
      if (this.grow[s] < 1) this.grow[s] = Math.min(1, this.grow[s] + dt / 0.62)
      d[s * 8 + 4] = this.emph[s]
      d[s * 8 + 5] = this.flow[s]
      d[s * 8 + 6] = this.growDir[s] * (this.grow[s] * 0.999 + 0.001)
      d[s * 8 + 7] = travelled.has(this.slots[s]) ? 1 : 0
    }
    this.uploaded = changed || this.uploadPending
    this.uploadPending = false
  }

  /** Force one upload on the next frame (after selection or travelled changes). */
  private uploadPending = true
  requestUpload() {
    this.uploadPending = true
  }
}
