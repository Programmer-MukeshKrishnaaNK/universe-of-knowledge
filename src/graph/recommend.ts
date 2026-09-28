import type { KnowledgeState, Topic } from '../data/schema'
import type { KnowledgeGraph } from '../knowledge/graph'

export type KnowledgeLookup = (id: string) => KnowledgeState | undefined

const isKnown = (s: KnowledgeState | undefined) => s === 'understood'

export interface PrereqItem {
  topic: Topic
  known: boolean
  /** 0 = direct prerequisite, 1 = prerequisite of a prerequisite. */
  depth: number
}

export interface PathAdvice {
  /** Every direct prerequisite is understood (or there are none). */
  ready: boolean
  /** Unmet prerequisites, most foundational first. */
  gaps: PrereqItem[]
  /** Direct prerequisites with their status. */
  direct: PrereqItem[]
  /** Best places to go after this. */
  next: Topic[]
  /** The single most useful step back, if any. */
  stepBack?: Topic
  readiness: number
}

/** Fraction of a topic's direct prerequisites the learner already understands. */
export function readiness(graph: KnowledgeGraph, id: string, know: KnowledgeLookup) {
  const pre = graph.prerequisites(id)
  if (!pre.length) return 1
  return pre.filter((p) => isKnown(know(p.id))).length / pre.length
}

const DIFFICULTY = { beginner: 0, intermediate: 1, advanced: 2, research: 3 } as const

/**
 * "Let's take one step back": the gentlest unmet direct prerequisite —
 * the one the learner is most ready for, then the least demanding.
 */
export function stepBack(graph: KnowledgeGraph, id: string, know: KnowledgeLookup): Topic | undefined {
  return graph
    .prerequisites(id)
    .filter((p) => !isKnown(know(p.id)))
    .sort(
      (a, b) =>
        readiness(graph, b.id, know) - readiness(graph, a.id, know) ||
        DIFFICULTY[a.difficulty] - DIFFICULTY[b.difficulty] ||
        (a.prerequisites?.length ?? 0) - (b.prerequisites?.length ?? 0),
    )[0]
}

export function advise(graph: KnowledgeGraph, id: string, know: KnowledgeLookup): PathAdvice {
  const direct = graph.prerequisites(id).map((t) => ({ topic: t, known: isKnown(know(t.id)), depth: 0 }))
  const gaps: PrereqItem[] = []
  const seen = new Set<string>([id])
  for (const d of direct) {
    if (d.known) continue
    // Surface one level of hidden gaps under each unmet prerequisite.
    for (const pp of graph.prerequisites(d.topic.id)) {
      if (seen.has(pp.id) || isKnown(know(pp.id))) continue
      seen.add(pp.id)
      gaps.push({ topic: pp, known: false, depth: 1 })
    }
    if (!seen.has(d.topic.id)) {
      seen.add(d.topic.id)
      gaps.push(d)
    }
  }
  const next = graph
    .deeper(id)
    .filter((t) => !isKnown(know(t.id)))
    .sort((a, b) => readiness(graph, b.id, know) - readiness(graph, a.id, know))
  return {
    ready: direct.every((d) => d.known),
    gaps,
    direct,
    next,
    stepBack: stepBack(graph, id, know),
    readiness: readiness(graph, id, know),
  }
}
