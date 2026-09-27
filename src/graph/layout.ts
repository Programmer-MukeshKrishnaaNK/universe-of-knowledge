import type { DomainId } from '../data/schema'
import type { KnowledgeGraph } from './buildGraph'
import { mulberry32 } from '../lib/random'

/**
 * Deterministic 3D layout.
 *
 * 1. Domains are placed by hand — they are the "galaxies" and their
 *    composition is a design decision, not an algorithmic one.
 * 2. Every other topic is seeded near its parent, pushed outward from its
 *    domain core and gently biased towards the domains it bridges to.
 * 3. A short force relaxation removes overlaps while an anchor spring keeps
 *    the hierarchical composition intact.
 *
 * O(n²) repulsion is fine for the first few thousand nodes; beyond that the
 * relaxation step should move to a Barnes–Hut octree in a worker.
 */

const DOMAIN_ANCHORS: Record<DomainId, [number, number, number]> = {
  mathematics: [-44, 6, -4],
  physics: [40, -4, 8],
  'computer-science': [-6, -44, 46],
  astronomy: [104, 30, -46],
  chemistry: [86, -54, 54],
  biology: [60, -104, 104],
  'earth-science': [150, -36, -94],
  neuroscience: [-86, -96, 104],
  engineering: [-128, 54, -76],
}

export const LEVEL_RADIUS = [0, 20, 8.5, 5.8]

export interface Layout {
  positions: Float32Array
  /** Bounding radius of each domain's cluster, by domain id. */
  domainRadius: Map<string, number>
  center: [number, number, number]
}

export function computeLayout(graph: KnowledgeGraph): Layout {
  const n = graph.size
  const rand = mulberry32(7)
  const pos = new Float32Array(n * 3)
  const anchor = new Float32Array(n * 3)
  const fixed = new Uint8Array(n)

  const domainPos = (d: DomainId) => DOMAIN_ANCHORS[d]

  // Process in level order so parents are placed before children.
  const order = graph.topics.map((_, i) => i).sort((a, b) => graph.topics[a].level - graph.topics[b].level)

  // Children counters for even angular distribution around each parent.
  const childCount = new Map<string, number>()
  const childSeen = new Map<string, number>()
  for (const t of graph.topics) if (t.parent) childCount.set(t.parent, (childCount.get(t.parent) ?? 0) + 1)

  for (const i of order) {
    const t = graph.topics[i]
    if (t.level === 0 || !t.parent) {
      const p = domainPos(t.domain)
      pos.set(p, i * 3)
      fixed[i] = 1
      continue
    }
    const pi = graph.idx(t.parent)
    const px = pos[pi * 3], py = pos[pi * 3 + 1], pz = pos[pi * 3 + 2]
    const dc = domainPos(t.domain)

    // Fibonacci direction for this child among its siblings.
    const k = childSeen.get(t.parent) ?? 0
    childSeen.set(t.parent, k + 1)
    const total = childCount.get(t.parent) ?? 1
    const golden = Math.PI * (3 - Math.sqrt(5))
    const yy = 1 - ((k + 0.5) / total) * 2
    const r = Math.sqrt(1 - yy * yy)
    const th = golden * k + rand() * 0.6 + (t.domain.length % 5)
    let dx = Math.cos(th) * r
    let dy = yy * 0.55 // flatten into a disk — galaxies, not balls
    let dz = Math.sin(th) * r

    // Outward from the domain core (children fan out away from home).
    if (t.level >= 2) {
      let ox = px - dc[0], oy = py - dc[1], oz = pz - dc[2]
      const ol = Math.hypot(ox, oy, oz) || 1
      ox /= ol; oy /= ol; oz /= ol
      dx += ox * 1.1; dy += oy * 1.1; dz += oz * 1.1
    }

    // Lean towards other domains this topic bridges to.
    const bridges = [...(t.related ?? []), ...(t.prerequisites ?? [])]
      .map((id) => graph.get(id))
      .filter((o) => o && o.domain !== t.domain)
    for (const o of bridges) {
      const od = domainPos(o!.domain)
      let bx = od[0] - px, by = od[1] - py, bz = od[2] - pz
      const bl = Math.hypot(bx, by, bz) || 1
      const w = 0.35 / bridges.length
      dx += (bx / bl) * w; dy += (by / bl) * w; dz += (bz / bl) * w
    }

    const dl = Math.hypot(dx, dy, dz) || 1
    const radius = LEVEL_RADIUS[t.level] * (t.level === 1 ? 1 + total * 0.02 : 1 + Math.min(total, 12) * 0.035) * (0.85 + rand() * 0.3)
    pos[i * 3] = px + (dx / dl) * radius
    pos[i * 3 + 1] = py + (dy / dl) * radius
    pos[i * 3 + 2] = pz + (dz / dl) * radius
  }
  anchor.set(pos)

  // ── Relaxation ────────────────────────────────────────────────────────
  const minDist = [0, 9, 4.6, 3.6]
  const force = new Float32Array(n * 3)
  for (let iter = 0; iter < 260; iter++) {
    force.fill(0)
    const cool = 1 - iter / 260
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const dx = pos[b * 3] - pos[a * 3]
        const dy = pos[b * 3 + 1] - pos[a * 3 + 1]
        const dz = pos[b * 3 + 2] - pos[a * 3 + 2]
        const d2 = dx * dx + dy * dy + dz * dz + 0.01
        const want = Math.max(minDist[graph.topics[a].level], minDist[graph.topics[b].level]) * 1.25
        if (d2 > want * want * 4) continue
        const d = Math.sqrt(d2)
        const push = d < want ? (want - d) * 0.5 : (want * want) / d2 * 0.04
        const fx = (dx / d) * push, fy = (dy / d) * push, fz = (dz / d) * push
        force[a * 3] -= fx; force[a * 3 + 1] -= fy; force[a * 3 + 2] -= fz
        force[b * 3] += fx; force[b * 3 + 1] += fy; force[b * 3 + 2] += fz
      }
    }
    // Hierarchy springs keep children at a readable distance from parents.
    for (let e = 0; e < graph.edgeSource.length; e++) {
      if (graph.edgeType[e] !== 0) continue
      const s = graph.edgeSource[e], t = graph.edgeTarget[e]
      const want = LEVEL_RADIUS[graph.topics[t].level] * 1.15
      const dx = pos[t * 3] - pos[s * 3]
      const dy = pos[t * 3 + 1] - pos[s * 3 + 1]
      const dz = pos[t * 3 + 2] - pos[s * 3 + 2]
      const d = Math.hypot(dx, dy, dz) || 1
      const k = (d - want) * 0.06
      force[t * 3] -= (dx / d) * k; force[t * 3 + 1] -= (dy / d) * k; force[t * 3 + 2] -= (dz / d) * k
    }
    for (let i = 0; i < n; i++) {
      if (fixed[i]) continue
      for (let c = 0; c < 3; c++) {
        const f = force[i * 3 + c] + (anchor[i * 3 + c] - pos[i * 3 + c]) * 0.03
        pos[i * 3 + c] += Math.max(-2, Math.min(2, f)) * (0.35 + 0.65 * cool)
      }
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────
  const domainRadius = new Map<string, number>()
  for (let i = 0; i < n; i++) {
    const t = graph.topics[i]
    const d = DOMAIN_ANCHORS[t.domain]
    const r = Math.hypot(pos[i * 3] - d[0], pos[i * 3 + 1] - d[1], pos[i * 3 + 2] - d[2])
    domainRadius.set(t.domain, Math.max(domainRadius.get(t.domain) ?? 6, r))
  }
  let cx = 0, cy = 0, cz = 0, mapped = 0
  for (const t of graph.topics) {
    if (t.level !== 0 || t.mapped === false) continue
    const d = DOMAIN_ANCHORS[t.domain]
    cx += d[0]; cy += d[1]; cz += d[2]; mapped++
  }
  return { positions: pos, domainRadius, center: [cx / mapped, cy / mapped, cz / mapped] }
}
