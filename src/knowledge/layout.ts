import { mulberry32 } from '../lib/random'

/**
 * Region layout — deterministic, region-local, and scalable.
 *
 * A region (a domain, or part of one) is laid out from its own topics plus a
 * little global context: where the domains sit, and which other domains each
 * topic bridges to. It never depends on what else is loaded, so a concept
 * always lives in the same neighbourhood no matter which order regions stream
 * in. The code is pure (no DOM, no three.js) so it runs in a worker unchanged.
 *
 *  1. Domains are placed by design — they are the galaxies.
 *  2. Children are seeded around their parent: small families on an even
 *     shell (the hand-tuned look), large families packed into a ball so
 *     density stays readable at thousands of concepts.
 *  3. Each child leans gently towards the domains it bridges to.
 *  4. A short relaxation removes overlaps using a spatial hash — cost grows
 *     with local density, not with the square of the region size.
 */

export const DOMAIN_ANCHORS: Record<string, [number, number, number]> = {
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
const MIN_DIST = [0, 9, 4.6, 3.6]
/** Families larger than this are packed as a ball instead of a shell. */
const SHELL_LIMIT = 36
const LEAF_SPACING = 4.4

export interface LayoutTopic {
  id: string
  parent?: string
  level: number
  domain: string
  /** Domains this topic has relationships into (other than its own). */
  bridges?: string[]
}

export interface RegionLayoutInput {
  topics: LayoutTopic[]
  /** Anchor of every domain in the universe (already scaled for the dataset). */
  anchors: Record<string, [number, number, number]>
  /** Positions of parents that live outside this region (rare; e.g. a region split from a domain). */
  external?: Record<string, [number, number, number]>
  seed?: number
}

export interface RegionLayoutResult {
  /** xyz per input topic, in input order. */
  positions: Float32Array
  /** Bounding radius around the region's domain anchor. */
  radius: number
}

/** Estimated radius a domain with `count` concepts will occupy — used to space the galaxies. */
export function estimateDomainRadius(count: number) {
  return Math.max(38, LEAF_SPACING * Math.cbrt(count) * 1.9)
}

/**
 * Domain anchors scaled so that large domains never overlap. For the curated
 * dataset (tens of concepts per domain) the scale is exactly 1.
 */
export function scaledAnchors(counts: Record<string, number>): Record<string, [number, number, number]> {
  const ids = Object.keys(DOMAIN_ANCHORS)
  let minGap = Infinity
  for (let a = 0; a < ids.length; a++)
    for (let b = a + 1; b < ids.length; b++) {
      const A = DOMAIN_ANCHORS[ids[a]], B = DOMAIN_ANCHORS[ids[b]]
      minGap = Math.min(minGap, Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]))
    }
  const biggest = Math.max(...ids.map((id) => estimateDomainRadius(counts[id] ?? 0)))
  const scale = Math.max(1, (biggest * 2.3) / minGap)
  return Object.fromEntries(ids.map((id) => [id, DOMAIN_ANCHORS[id].map((v) => v * scale) as [number, number, number]]))
}

export function layoutRegion(input: RegionLayoutInput): RegionLayoutResult {
  const { topics, anchors } = input
  const n = topics.length
  const rand = mulberry32(input.seed ?? 7)
  const pos = new Float32Array(n * 3)
  const anchorPos = new Float32Array(n * 3)
  const fixed = new Uint8Array(n)
  const local = new Map<string, number>()
  topics.forEach((t, i) => local.set(t.id, i))

  const kids: number[][] = topics.map(() => [])
  topics.forEach((t, i) => {
    const p = t.parent ? local.get(t.parent) : undefined
    if (p !== undefined) kids[p].push(i)
  })

  // Descendant counts and subtree radii, bottom-up (deepest level first).
  const order = topics.map((_, i) => i).sort((a, b) => topics[a].level - topics[b].level)
  const desc = new Float64Array(n)
  const subR = new Float64Array(n)
  for (let k = order.length - 1; k >= 0; k--) {
    const i = order[k]
    let d = 0
    let maxChild = 0
    for (const c of kids[i]) {
      d += 1 + desc[c]
      maxChild = Math.max(maxChild, subR[c])
    }
    desc[i] = d
    if (!kids[i].length) subR[i] = 0
    else if (kids[i].length > SHELL_LIMIT) subR[i] = LEAF_SPACING * Math.cbrt(kids[i].length) * 0.62 + maxChild * 1.6 + LEVEL_RADIUS[Math.min(3, topics[i].level + 1)]
    else subR[i] = LEVEL_RADIUS[Math.min(3, topics[i].level + 1)] * 1.2 + maxChild
  }

  const golden = Math.PI * (3 - Math.sqrt(5))
  const seen = new Map<number, number>()
  const childDist = new Float32Array(n)

  for (const i of order) {
    const t = topics[i]
    const pLocal = t.parent ? local.get(t.parent) : undefined
    if (t.level === 0 || pLocal === undefined) {
      const ext = t.parent ? input.external?.[t.parent] : undefined
      if (t.level === 0 || !ext) {
        const a = anchors[t.domain] ?? [0, 0, 0]
        pos.set(a, i * 3)
        fixed[i] = t.level === 0 ? 1 : 0
        continue
      }
    }
    const parentPos: [number, number, number] =
      pLocal !== undefined ? [pos[pLocal * 3], pos[pLocal * 3 + 1], pos[pLocal * 3 + 2]] : input.external![t.parent!]
    const px = parentPos[0], py = parentPos[1], pz = parentPos[2]
    const dc = anchors[t.domain] ?? [0, 0, 0]
    const siblings = pLocal !== undefined ? kids[pLocal] : [i]
    const total = siblings.length
    const k = seen.get(pLocal ?? -1) ?? 0
    seen.set(pLocal ?? -1, k + 1)

    let dx: number, dy: number, dz: number, radius: number
    if (total <= SHELL_LIMIT) {
      // The hand-tuned shell (unchanged for the curated universe).
      const yy = 1 - ((k + 0.5) / total) * 2
      const r = Math.sqrt(1 - yy * yy)
      const th = golden * k + rand() * 0.6 + (t.domain.length % 5)
      dx = Math.cos(th) * r
      dy = yy * 0.55
      dz = Math.sin(th) * r
      if (t.level >= 2) {
        let ox = px - dc[0], oy = py - dc[1], oz = pz - dc[2]
        const ol = Math.hypot(ox, oy, oz) || 1
        ox /= ol; oy /= ol; oz /= ol
        dx += ox * 1.1; dy += oy * 1.1; dz += oz * 1.1
      }
      radius = LEVEL_RADIUS[t.level] * (t.level === 1 ? 1 + total * 0.02 : 1 + Math.min(total, 12) * 0.035) * (0.85 + rand() * 0.3)
      if (subR[i] > LEVEL_RADIUS[t.level]) radius += subR[i] * 1.1 // big subtrees need room
    } else {
      // Large families: fibonacci ball, flattened into a disk-like cloud.
      const u = (k + 0.5) / total
      const yy = 1 - u * 2
      const r = Math.sqrt(Math.max(0, 1 - yy * yy))
      const th = golden * k
      dx = Math.cos(th) * r
      dy = yy * 0.6
      dz = Math.sin(th) * r
      const ball = LEAF_SPACING * Math.cbrt(total) * 0.62 + subR[i] * 1.4
      radius = LEVEL_RADIUS[t.level] * 0.6 + ball * Math.cbrt((((k * 0.61803398875) % 1) + 0.02) / 1.02) * 1.35
    }

    // Lean towards the domains this topic bridges to.
    const bridges = t.bridges ?? []
    for (const b of bridges) {
      const od = anchors[b]
      if (!od) continue
      let bx = od[0] - px, by = od[1] - py, bz = od[2] - pz
      const bl = Math.hypot(bx, by, bz) || 1
      const w = 0.35 / bridges.length
      dx += (bx / bl) * w; dy += (by / bl) * w; dz += (bz / bl) * w
    }
    const dl = Math.hypot(dx, dy, dz) || 1
    pos[i * 3] = px + (dx / dl) * radius
    pos[i * 3 + 1] = py + (dy / dl) * radius
    pos[i * 3 + 2] = pz + (dz / dl) * radius
    childDist[i] = radius
  }
  anchorPos.set(pos)

  // ── Relaxation (spatial hash) ─────────────────────────────────────────
  const iterations = n <= 400 ? 260 : n <= 4000 ? 60 : 26
  const cell = 9
  const force = new Float32Array(n * 3)
  const grid = new Map<number, number[]>()
  const keyOf = (x: number, y: number, z: number) => ((x + 32768) * 65536 + (y + 32768)) * 65536 + (z + 32768)
  const shellFamily = new Uint8Array(n)
  topics.forEach((t, i) => {
    const p = t.parent ? local.get(t.parent) : undefined
    shellFamily[i] = p === undefined || kids[p].length <= SHELL_LIMIT ? 1 : 0
  })

  for (let iter = 0; iter < iterations; iter++) {
    force.fill(0)
    const cool = 1 - iter / iterations
    grid.clear()
    for (let i = 0; i < n; i++) {
      const k = keyOf(Math.floor(pos[i * 3] / cell), Math.floor(pos[i * 3 + 1] / cell), Math.floor(pos[i * 3 + 2] / cell))
      const list = grid.get(k)
      if (list) list.push(i)
      else grid.set(k, [i])
    }
    for (let a = 0; a < n; a++) {
      const la = topics[a].level
      const range = MIN_DIST[Math.min(la, 3)] * 1.25 * 2
      const span = Math.ceil(range / cell)
      const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2]
      const cx = Math.floor(ax / cell), cy = Math.floor(ay / cell), cz = Math.floor(az / cell)
      for (let ix = -span; ix <= span; ix++)
        for (let iy = -span; iy <= span; iy++)
          for (let iz = -span; iz <= span; iz++) {
            const list = grid.get(keyOf(cx + ix, cy + iy, cz + iz))
            if (!list) continue
            for (const b of list) {
              if (b === a) continue
              const dx = pos[b * 3] - ax, dy = pos[b * 3 + 1] - ay, dz = pos[b * 3 + 2] - az
              const d2 = dx * dx + dy * dy + dz * dz + 0.01
              const want = Math.max(MIN_DIST[Math.min(la, 3)], MIN_DIST[Math.min(topics[b].level, 3)]) * 1.25
              if (d2 > want * want * 4) continue
              const d = Math.sqrt(d2)
              // Each node applies its own half of the pair force (the other node does the same).
              const push = (d < want ? (want - d) * 0.5 : ((want * want) / d2) * 0.04) * 0.5
              force[a * 3] -= (dx / d) * push * 2
              force[a * 3 + 1] -= (dy / d) * push * 2
              force[a * 3 + 2] -= (dz / d) * push * 2
            }
          }
    }
    // Hierarchy springs keep families at a readable distance from their parent.
    for (let i = 0; i < n; i++) {
      const p = topics[i].parent ? local.get(topics[i].parent!) : undefined
      if (p === undefined) continue
      const want = shellFamily[i] ? LEVEL_RADIUS[topics[i].level] * 1.15 + (subR[i] > LEVEL_RADIUS[topics[i].level] ? subR[i] * 1.1 : 0) : childDist[i]
      const dx = pos[i * 3] - pos[p * 3], dy = pos[i * 3 + 1] - pos[p * 3 + 1], dz = pos[i * 3 + 2] - pos[p * 3 + 2]
      const d = Math.hypot(dx, dy, dz) || 1
      const k = (d - want) * 0.06
      force[i * 3] -= (dx / d) * k; force[i * 3 + 1] -= (dy / d) * k; force[i * 3 + 2] -= (dz / d) * k
    }
    for (let i = 0; i < n; i++) {
      if (fixed[i]) continue
      for (let c = 0; c < 3; c++) {
        const f = force[i * 3 + c] + (anchorPos[i * 3 + c] - pos[i * 3 + c]) * 0.03
        pos[i * 3 + c] += Math.max(-2, Math.min(2, f)) * (0.35 + 0.65 * cool)
      }
    }
  }

  let radius = 6
  for (let i = 0; i < n; i++) {
    const a = anchors[topics[i].domain] ?? [0, 0, 0]
    radius = Math.max(radius, Math.hypot(pos[i * 3] - a[0], pos[i * 3 + 1] - a[1], pos[i * 3 + 2] - a[2]))
  }
  return { positions: pos, radius }
}
