import type { KnowledgeState, Topic } from '../data/schema'
import type { KnowledgeGraph } from './graph'
import { RELATIONS } from './relations'

export type DiscoveryReason = 'deeper' | 'bridge' | 'related' | 'unexplored' | 'prerequisite' | 'nearby'

export interface Discovery {
  topic: Topic
  score: number
  reason: DiscoveryReason
  /** Edge path from the origin (1 or 2 hops). */
  via: number[]
}

export interface DiscoveryContext {
  know: (id: string) => KnowledgeState | undefined
  /** Optional spatial neighbours (node indices) — lets discovery include "nearby in space". */
  nearby?: number[]
  limit?: number
}

const DIFFICULTY = { beginner: 0, intermediate: 1, advanced: 2, research: 3 } as const

/**
 * "What is interesting from where I am?"
 *
 * Scores candidates within two hops by relevance, novelty, readiness,
 * difficulty fit and — deliberately — the surprise of crossing into another
 * domain. It is a reusable engine: the glance, the guide and future
 * discovery features all ask it the same question.
 */
export function discover(g: KnowledgeGraph, from: number, ctx: DiscoveryContext): Discovery[] {
  if (from < 0) return []
  const origin = g.topics[from]
  const best = new Map<number, Discovery>()
  const readiness = (t: Topic) => {
    const pre = t.prerequisites ?? []
    if (!pre.length) return 1
    return pre.filter((p) => ctx.know(p) === 'understood').length / pre.length
  }

  const consider = (i: number, hop: 1 | 2, via: number[], edge: number) => {
    if (i === from) return
    const t = g.topics[i]
    if (t.level === 0 && origin.level > 0) return // domains are landmarks, not destinations from inside
    const state = ctx.know(t.id)
    const type = g.typeOf(edge)
    const family = RELATIONS[type].family
    const cross = g.edgeCross[edge] === 1
    const isDeeper = g.dependentIdx[from].includes(i) || g.childIdx[from].includes(i)
    const isPrereq = (origin.prerequisites ?? []).includes(t.id)

    let reason: DiscoveryReason = cross ? 'bridge' : isDeeper ? 'deeper' : isPrereq ? 'prerequisite' : family === 'association' ? 'related' : 'nearby'
    let score = hop === 1 ? 1 : 0.45
    score += cross ? 0.75 : 0 // the unexpected connection is the point of exploring
    score += isDeeper ? 0.45 * readiness(t) : 0
    score += state === undefined ? 0.35 : state === 'understood' ? -0.9 : state === 'discovered' ? -0.15 : 0
    if (state === undefined && !cross && !isDeeper) reason = hop === 2 ? 'unexplored' : reason
    // Prefer a gentle step in difficulty.
    score -= Math.max(0, DIFFICULTY[t.difficulty] - DIFFICULTY[origin.difficulty] - 1) * 0.3
    score += Math.min(0.25, g.degree(i) * 0.015) // well-connected ideas open more doors
    const prev = best.get(i)
    if (!prev || prev.score < score) best.set(i, { topic: t, score, reason, via })
  }

  for (const e of g.adj[from]) {
    const o = g.other(e, from)
    consider(o, 1, [e], e)
  }
  // Second hop: only through the strongest few neighbours, to stay local and cheap.
  const firstHop = [...g.adj[from]].sort((a, b) => g.edgeStrength[b] - g.edgeStrength[a]).slice(0, 12)
  for (const e1 of firstHop) {
    const mid = g.other(e1, from)
    for (const e2 of g.adj[mid].slice(0, 40)) consider(g.other(e2, mid), 2, [e1, e2], e2)
  }
  for (const i of ctx.nearby ?? []) if (!best.has(i) && i !== from) best.set(i, { topic: g.topics[i], score: 0.3, reason: 'nearby', via: [] })

  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, ctx.limit ?? 8)
}
