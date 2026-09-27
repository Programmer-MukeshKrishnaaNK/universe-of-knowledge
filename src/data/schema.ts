/**
 * The knowledge model.
 *
 * Authoring happens per-topic (see ./topics/*) because that is how humans
 * write explanations. At load time the topics are normalised into a flat
 * Topic table + Relationship list (see ../graph/buildGraph.ts), which is the
 * shape a database-backed graph of millions of topics would also take.
 *
 * Rich text fields support two inline syntaxes:
 *   [[topic-id]] or [[topic-id|display text]]  → a link into the universe
 *   $inline math$ and $$display math$$          → rendered with KaTeX
 */

export type DomainId =
  | 'mathematics'
  | 'physics'
  | 'astronomy'
  | 'computer-science'
  | 'chemistry'
  | 'biology'
  | 'earth-science'
  | 'neuroscience'
  | 'engineering'

/** 0 = domain, 1 = field, 2 = concept, 3 = deep concept */
export type TopicLevel = 0 | 1 | 2 | 3

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'research'

export interface Misconception {
  myth: string
  truth: string
}

export type PaperKind = 'foundational' | 'experiment' | 'review' | 'recent'

export interface TopicPaperRef {
  paper: string
  kind: PaperKind
}

export interface Topic {
  id: string
  title: string
  /** Alternate names used by search (e.g. "black holes", "EPR"). */
  aliases?: string[]
  domain: DomainId
  level: TopicLevel
  /** Spatial / hierarchical parent. Domains have none. */
  parent?: string
  difficulty: Difficulty
  /** One line. Used for tooltips and search. */
  short: string
  /** "What is it?" — plain language, no jargon. */
  simple: string
  /** "Explain like I'm new" — intuition first. */
  intuition?: string
  /** "Think of it like this". */
  analogy?: string
  /** "How it actually works" — the detailed layer. */
  howItWorks?: string
  /** The technical layer. */
  technical?: string
  /** "The mathematics" — may contain $…$ / $$…$$. */
  math?: string
  /** "Why does it matter?" */
  why?: string
  /** "Where is it used?" */
  applications?: string[]
  misconceptions?: Misconception[]
  /** Topics that make this one easier to understand. */
  prerequisites?: string[]
  /** Sideways connections. */
  related?: string[]
  /** Explicit "go deeper" targets (children and dependants are added automatically). */
  deeper?: string[]
  research?: TopicPaperRef[]
  openQuestions?: string[]
  tags?: string[]
  /** false → this region of the universe exists but has not been charted yet. */
  mapped?: boolean
}

export type RelationshipType = 'contains' | 'prerequisite' | 'related' | 'bridge'

export interface Relationship {
  source: string
  target: string
  type: RelationshipType
  /** 0..1 — how strongly the two ideas depend on each other. */
  strength: number
}

export interface Paper {
  id: string
  title: string
  authors: string
  year: number
  publication: string
  doi?: string
  arxiv?: string
  /** A plain-language summary written for this project (not the abstract). */
  summary: string
  whyItMatters: string
  background: Difficulty
}

export type KnowledgeState = 'discovered' | 'learning' | 'understood' | 'review' | 'want_to_learn'

export interface UserKnowledge {
  userId: string
  topicId: string
  state: KnowledgeState
  /** 0..1 — self-reported confidence. */
  confidence: number
  lastSeen: number
  updatedAt: number
}

export interface DomainStyle {
  id: DomainId
  color: string
}
