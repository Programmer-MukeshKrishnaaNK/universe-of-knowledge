import type { KnowledgeState, Topic } from '../data/schema'
import { discover, type DiscoveryReason } from './explore'
import type { KnowledgeGraph } from './graph'
import { bridgesBetween, journeyRoute, learningPath } from './traverse'

/**
 * What the AI guide may ask of the knowledge graph. Everything returned is a
 * plain, detached summary (ids, titles, reasons) — never a graph object — so
 * the guide can read the universe but has no way to change it. Anything a
 * model writes stays commentary; only validated ingestion adds knowledge.
 */
export interface TopicRef {
  id: string
  title: string
  domain: string
  short: string
}

export interface GuideDiscovery extends TopicRef {
  reason: DiscoveryReason
}

export interface GuideBridge {
  from: TopicRef
  to: TopicRef
  type: string
}

const ref = (t: Topic): TopicRef => ({ id: t.id, title: t.title, domain: t.domain, short: t.short })

export class GuideKnowledge {
  constructor(private readonly g: KnowledgeGraph) {}

  topic(id: string): TopicRef | null {
    const t = this.g.get(id)
    return t ? ref(t) : null
  }

  prerequisites(id: string) {
    return this.g.prerequisites(id).map(ref)
  }

  related(id: string) {
    return this.g.related(id).map(ref)
  }

  deeper(id: string) {
    return this.g.deeper(id).map(ref)
  }

  /** The route a journey would physically travel. */
  route(fromId: string | null, toId: string) {
    return journeyRoute(this.g, fromId, toId)
      .map((id) => this.g.get(id))
      .filter((t): t is Topic => !!t)
      .map(ref)
  }

  /** What to understand first, in order, given what the learner already knows. */
  learningPath(id: string, known: string[] = []) {
    const set = new Set(known)
    return learningPath(this.g, id, (x) => (set.has(x) ? 'understood' : undefined)).map(ref)
  }

  /** Connections from this topic's domain into others, strongest first. */
  bridges(id: string, limit = 6): GuideBridge[] {
    const t = this.g.get(id)
    if (!t) return []
    const touching = bridgesBetween(this.g, t.domain, undefined, 200).filter((b) => b.from.id === id || b.to.id === id)
    const list = touching.length ? touching : bridgesBetween(this.g, t.domain, undefined, limit)
    return list.slice(0, limit).map((b) => ({ from: ref(b.from), to: ref(b.to), type: this.g.typeOf(b.edge) }))
  }

  /** Candidates worth exploring from here, each with the reason it was chosen. */
  discoveries(id: string, known: string[] = [], limit = 6): GuideDiscovery[] {
    const set = new Set(known)
    const know = (x: string): KnowledgeState | undefined => (set.has(x) ? 'understood' : undefined)
    return discover(this.g, this.g.idx(id), { know, limit }).map((d) => ({ ...ref(d.topic), reason: d.reason }))
  }

  /** Everything the guide might want about one topic, in one detached bundle. */
  context(id: string, known: string[] = []) {
    const topic = this.topic(id)
    if (!topic) return null
    return {
      topic,
      prerequisites: this.prerequisites(id),
      related: this.related(id),
      deeper: this.deeper(id),
      learningPath: this.learningPath(id, known),
      bridges: this.bridges(id),
      discoveries: this.discoveries(id, known),
    }
  }
}
