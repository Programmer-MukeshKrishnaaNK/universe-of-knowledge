import type { KnowledgeState, Topic } from '../data/schema'
import type { KnowledgeGraph } from './graph'
import { CROSS_DOMAIN_COST, RELATIONS, RELATION_BY_CODE } from './relations'

/**
 * Graph traversal — shared by search journeys, recommendations, the guide
 * and discovery. Everything works on integer node indices and adjacency
 * lists, so cost is proportional to the neighbourhood explored, never to
 * the size of the universe.
 */

/** Unweighted shortest path (fewest hops). Returns node indices, or [] if unreachable. */
export function shortestPath(g: KnowledgeGraph, from: number, to: number, maxDepth = 12): number[] {
  if (from < 0 || to < 0) return []
  if (from === to) return [from]
  const prev = new Map<number, number>([[from, from]])
  let frontier = [from]
  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    const next: number[] = []
    for (const n of frontier) {
      for (const e of g.adj[n]) {
        const o = g.other(e, n)
        if (prev.has(o)) continue
        prev.set(o, n)
        if (o === to) return unwind(prev, from, to)
        next.push(o)
      }
    }
    frontier = next
  }
  return []
}

/**
 * The most *meaningful* path: Dijkstra over relationship costs, so routes
 * prefer hierarchy and dependencies over loose associations, and cross
 * between domains only when that is genuinely the shortest idea-distance.
 */
export function meaningfulPath(g: KnowledgeGraph, from: number, to: number, maxExpanded = 250_000): number[] {
  if (from < 0 || to < 0) return []
  if (from === to) return [from]
  const dist = new Map<number, number>([[from, 0]])
  const prev = new Map<number, number>([[from, from]])
  const heap = new MinHeap()
  heap.push(from, 0)
  let expanded = 0
  while (heap.size && expanded++ < maxExpanded) {
    const [n, d] = heap.pop()
    if (n === to) return unwind(prev, from, to)
    if (d > (dist.get(n) ?? Infinity)) continue
    for (const e of g.adj[n]) {
      const o = g.other(e, n)
      const cost = RELATIONS[RELATION_BY_CODE[g.edgeType[e]]].cost * (1.2 - 0.4 * g.edgeStrength[e]) + (g.edgeCross[e] ? CROSS_DOMAIN_COST : 0)
      const nd = d + cost
      if (nd < (dist.get(o) ?? Infinity)) {
        dist.set(o, nd)
        prev.set(o, n)
        heap.push(o, nd)
      }
    }
  }
  return []
}

/** Route that follows the hierarchy: climb to a shared ancestor, then descend. */
export function hierarchicalRoute(g: KnowledgeGraph, fromId: string | null, toId: string): string[] {
  const down = g.lineage(toId).map((t) => t.id)
  if (!fromId) return down
  if (g.edgeBetween(g.idx(fromId), g.idx(toId)) >= 0) return [fromId, toId]
  const up = g.lineage(fromId).map((t) => t.id)
  let common = 0
  while (common < up.length && common < down.length && up[common] === down[common]) common++
  let route = common === 0 ? [...up.slice().reverse(), ...down] : [...up.slice(common - 1).reverse(), ...down.slice(common)]
  if (route.length > 6) route = [route[0], ...route.slice(-5)]
  return route
}

/**
 * A journey for search / travel: a short meaningful path when the two ideas
 * are genuinely close (e.g. Linear Algebra → Quantum Mechanics is one step),
 * otherwise the legible hierarchical route (zoom out, cross, zoom in).
 */
export function journeyRoute(g: KnowledgeGraph, fromId: string | null, toId: string): string[] {
  if (!fromId) return hierarchicalRoute(g, null, toId)
  const semantic = meaningfulPath(g, g.idx(fromId), g.idx(toId), 4000)
  const hierarchy = hierarchicalRoute(g, fromId, toId)
  if (semantic.length && semantic.length <= Math.min(4, hierarchy.length)) return semantic.map((i) => g.topics[i].id)
  return hierarchy
}

/**
 * Everything the learner still needs before `targetId`, in an order that can
 * actually be followed (prerequisites before what depends on them).
 * Cycle-safe: a malformed dataset cannot hang the traversal.
 */
export function learningPath(g: KnowledgeGraph, targetId: string, know: (id: string) => KnowledgeState | undefined, maxDepth = 6): Topic[] {
  const order: Topic[] = []
  const state = new Map<string, 0 | 1 | 2>() // 1 = visiting, 2 = done
  const visit = (id: string, depth: number) => {
    const s = state.get(id)
    if (s === 2 || s === 1 || depth > maxDepth) return
    state.set(id, 1)
    for (const p of g.prerequisites(id)) if (know(p.id) !== 'understood') visit(p.id, depth + 1)
    state.set(id, 2)
    const t = g.get(id)
    if (t) order.push(t)
  }
  visit(targetId, 0)
  return order.filter((t) => t.id !== targetId)
}

export interface Bridge {
  edge: number
  from: Topic
  to: Topic
  strength: number
}

/** Relationships that cross from one domain into another, strongest first. */
export function bridgesBetween(g: KnowledgeGraph, domainA: string, domainB?: string, limit = 12): Bridge[] {
  const out: Bridge[] = []
  for (const i of g.byDomain.get(domainA) ?? []) {
    for (const e of g.adj[i]) {
      if (!g.edgeCross[e]) continue
      const o = g.other(e, i)
      if (domainB && g.topics[o].domain !== domainB) continue
      out.push({ edge: e, from: g.topics[i], to: g.topics[o], strength: g.edgeStrength[e] + (RELATIONS[g.typeOf(e)].family === 'flow' ? 0.3 : 0) })
    }
  }
  return out.sort((a, b) => b.strength - a.strength).slice(0, limit)
}

/** The most natural way from one domain into another: through its strongest bridge. */
export function crossDomainRoute(g: KnowledgeGraph, fromDomain: string, toDomain: string): string[] {
  const [best] = bridgesBetween(g, fromDomain, toDomain, 1)
  if (!best) return hierarchicalRoute(g, fromDomain, toDomain)
  const a = hierarchicalRoute(g, fromDomain, best.from.id)
  const b = hierarchicalRoute(g, best.to.id, toDomain)
  return [...a, ...b].filter((id, k, all) => all.indexOf(id) === k)
}

function unwind(prev: Map<number, number>, from: number, to: number) {
  const out = [to]
  let c = to
  while (c !== from) {
    c = prev.get(c)!
    out.push(c)
  }
  return out.reverse()
}

/** Minimal binary heap keyed by priority. */
class MinHeap {
  private items: number[] = []
  private prio: number[] = []
  get size() {
    return this.items.length
  }
  push(item: number, p: number) {
    this.items.push(item)
    this.prio.push(p)
    let i = this.items.length - 1
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.prio[parent] <= this.prio[i]) break
      this.swap(i, parent)
      i = parent
    }
  }
  pop(): [number, number] {
    const top: [number, number] = [this.items[0], this.prio[0]]
    const lastItem = this.items.pop()!
    const lastPrio = this.prio.pop()!
    if (this.items.length) {
      this.items[0] = lastItem
      this.prio[0] = lastPrio
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let m = i
        if (l < this.items.length && this.prio[l] < this.prio[m]) m = l
        if (r < this.items.length && this.prio[r] < this.prio[m]) m = r
        if (m === i) break
        this.swap(i, m)
        i = m
      }
    }
    return top
  }
  private swap(a: number, b: number) {
    ;[this.items[a], this.items[b]] = [this.items[b], this.items[a]]
    ;[this.prio[a], this.prio[b]] = [this.prio[b], this.prio[a]]
  }
}
