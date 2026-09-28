import type { Provenance, Relationship, RelationshipType, Topic } from '../data/schema'
import { RELATIONS, RELATION_BY_CODE } from './relations'

interface PendingRelation {
  source: string
  target: string
  type: RelationshipType
  strength: number
  note?: string
  provenance?: Provenance
}

/** Numeric key for an unordered pair of node indices (safe up to ~4M nodes). */
const pairKey = (a: number, b: number) => (a < b ? a * 4_194_304 + b : b * 4_194_304 + a)

/**
 * The knowledge graph.
 *
 * - Topics are addressed by dense integer index; every per-node and per-edge
 *   property lives in arrays so renderers can hand them straight to the GPU.
 * - Everything is indexed on insertion (by id, domain, region, tag, parent,
 *   dependents, associations, node pair), so no query scans the dataset.
 * - Topics can be added incrementally, region by region. Relationships whose
 *   other end has not arrived yet wait in a pending table and connect the
 *   moment it does — the order regions load in never changes the result.
 */
export class KnowledgeGraph {
  readonly topics: Topic[] = []
  readonly index = new Map<string, number>()

  private capacity = 0
  edgeSource = new Int32Array(0)
  edgeTarget = new Int32Array(0)
  edgeType = new Uint8Array(0)
  edgeStrength = new Float32Array(0)
  /** 1 when the edge crosses between domains. */
  edgeCross = new Uint8Array(0)
  edgeCount = 0

  /** Edge ids touching each node (both directions). */
  readonly adj: number[][] = []
  /** Hierarchy: node → child node indices. */
  readonly childIdx: number[][] = []
  /** node → nodes that list it as a prerequisite. */
  readonly dependentIdx: number[][] = []
  /** node → nodes it is associated with (related / bridge), both directions. */
  readonly associatedIdx: number[][] = []
  /** node → typed authored relations (application, uses, …) out of and into it. */
  readonly typedIdx: { other: number; type: RelationshipType; outgoing: boolean }[][] = []

  readonly byDomain = new Map<string, number[]>()
  readonly byRegion = new Map<string, number[]>()
  readonly byTag = new Map<string, number[]>()

  private readonly pairs = new Map<number, number>()
  private readonly pending = new Map<string, PendingRelation[]>()
  private readonly listeners = new Set<(added: number[]) => void>()
  /** Bumped on every mutation — lets caches know when to refresh. */
  version = 0

  constructor(topics?: Topic[]) {
    if (topics) this.addTopics(topics)
  }

  // ─── Loading ──────────────────────────────────────────────────────────

  /** Add a batch (typically one region). Returns the new node indices. */
  addTopics(list: Topic[]): number[] {
    const added: number[] = []
    for (const t of list) {
      if (this.index.has(t.id)) continue
      const i = this.topics.length
      this.topics.push(t)
      this.index.set(t.id, i)
      this.adj.push([])
      this.childIdx.push([])
      this.dependentIdx.push([])
      this.associatedIdx.push([])
      this.typedIdx.push([])
      push(this.byDomain, t.domain, i)
      push(this.byRegion, t.region ?? t.domain, i)
      for (const tag of t.tags ?? []) push(this.byTag, tag.toLowerCase(), i)
      added.push(i)
    }
    for (const i of added) {
      const t = this.topics[i]
      if (t.parent) this.relate({ source: t.parent, target: t.id, type: 'contains', strength: 1 })
      for (const p of t.prerequisites ?? []) this.relate({ source: p, target: t.id, type: 'prerequisite', strength: 0.8 })
      for (const r of t.related ?? []) this.relate({ source: t.id, target: r, type: 'related', strength: 0.5 })
      for (const r of t.relations ?? []) this.relate({ source: t.id, target: r.target, type: r.type, strength: r.strength ?? 0.6, note: r.note, provenance: r.provenance })
      // Anything that was waiting for this topic can now connect.
      const waiting = this.pending.get(t.id)
      if (waiting) {
        this.pending.delete(t.id)
        for (const w of waiting) this.relate(w)
      }
    }
    if (added.length) {
      this.version++
      for (const l of this.listeners) l(added)
    }
    return added
  }

  onAdd(listener: (added: number[]) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Relationships still waiting for an endpoint that has not been loaded. */
  get pendingCount() {
    let n = 0
    for (const list of this.pending.values()) n += list.length
    return n
  }

  private relate(r: PendingRelation) {
    const s = this.index.get(r.source)
    const t = this.index.get(r.target)
    if (s === undefined || t === undefined) {
      const missing = s === undefined ? r.source : r.target
      push(this.pending, missing, r)
      return
    }
    if (s === t) return

    // Semantic indexes keep what was authored, independent of edge merging.
    if (r.type === 'contains') this.childIdx[s].push(t)
    else if (r.type === 'prerequisite') this.dependentIdx[s].push(t)
    else if (r.type === 'related' || r.type === 'bridge') {
      addUnique(this.associatedIdx[s], t)
      addUnique(this.associatedIdx[t], s)
    } else {
      this.typedIdx[s].push({ other: t, type: r.type, outgoing: true })
      this.typedIdx[t].push({ other: s, type: r.type, outgoing: false })
    }

    const cross = this.topics[s].domain !== this.topics[t].domain
    const type: RelationshipType = r.type === 'related' && cross ? 'bridge' : r.type
    const key = pairKey(s, t)
    const existing = this.pairs.get(key)
    if (existing !== undefined) {
      // One rendered edge per pair — keep the most structural relationship.
      if (RELATIONS[type].rank < RELATIONS[RELATION_BY_CODE[this.edgeType[existing]]].rank) {
        this.edgeSource[existing] = s
        this.edgeTarget[existing] = t
        this.edgeType[existing] = RELATIONS[type].code
        this.edgeStrength[existing] = r.strength
      }
      return
    }
    const e = this.edgeCount++
    if (e >= this.capacity) this.grow()
    this.edgeSource[e] = s
    this.edgeTarget[e] = t
    this.edgeType[e] = RELATIONS[type].code
    this.edgeStrength[e] = r.strength
    this.edgeCross[e] = cross ? 1 : 0
    this.pairs.set(key, e)
    this.adj[s].push(e)
    this.adj[t].push(e)
  }

  private grow() {
    const cap = Math.max(256, this.capacity * 2)
    const copy = <T extends Int32Array | Uint8Array | Float32Array>(a: T, C: new (n: number) => T) => {
      const b = new C(cap)
      b.set(a)
      return b
    }
    this.edgeSource = copy(this.edgeSource, Int32Array)
    this.edgeTarget = copy(this.edgeTarget, Int32Array)
    this.edgeType = copy(this.edgeType, Uint8Array)
    this.edgeStrength = copy(this.edgeStrength, Float32Array)
    this.edgeCross = copy(this.edgeCross, Uint8Array)
    this.capacity = cap
  }

  // ─── Lookup ───────────────────────────────────────────────────────────

  get size() {
    return this.topics.length
  }

  get(id: string | undefined | null): Topic | undefined {
    if (!id) return undefined
    const i = this.index.get(id)
    return i === undefined ? undefined : this.topics[i]
  }

  idx(id: string): number {
    return this.index.get(id) ?? -1
  }

  other(edge: number, node: number) {
    return this.edgeSource[edge] === node ? this.edgeTarget[edge] : this.edgeSource[edge]
  }

  neighbors(node: number): number[] {
    return this.adj[node].map((e) => this.other(e, node))
  }

  edgeBetween(a: number, b: number): number {
    if (a < 0 || b < 0) return -1
    return this.pairs.get(pairKey(a, b)) ?? -1
  }

  typeOf(edge: number): RelationshipType {
    return RELATION_BY_CODE[this.edgeType[edge]]
  }

  /** A relationship as a plain record (built on demand). */
  relationship(edge: number): Relationship {
    return {
      source: this.topics[this.edgeSource[edge]].id,
      target: this.topics[this.edgeTarget[edge]].id,
      type: this.typeOf(edge),
      strength: this.edgeStrength[edge],
      crossDomain: this.edgeCross[edge] === 1,
    }
  }

  private toTopics(list: number[]) {
    return list.map((i) => this.topics[i])
  }

  children(id: string): Topic[] {
    const i = this.idx(id)
    return i < 0 ? [] : this.toTopics(this.childIdx[i])
  }

  /** Topics that list `id` as a prerequisite. */
  dependents(id: string): Topic[] {
    const i = this.idx(id)
    return i < 0 ? [] : this.toTopics(this.dependentIdx[i])
  }

  prerequisites(id: string): Topic[] {
    return (this.get(id)?.prerequisites ?? []).map((p) => this.get(p)).filter(Boolean) as Topic[]
  }

  related(id: string): Topic[] {
    const i = this.idx(id)
    if (i < 0) return []
    const t = this.topics[i]
    const out = new Set<number>(this.associatedIdx[i])
    const parent = t.parent ? this.idx(t.parent) : -1
    if (parent >= 0) out.add(parent)
    for (const p of t.prerequisites ?? []) out.delete(this.idx(p))
    out.delete(i)
    return this.toTopics([...out])
  }

  /** Where to go after understanding `id`: explicit, then children, then dependents. */
  deeper(id: string): Topic[] {
    const i = this.idx(id)
    if (i < 0) return []
    const out: number[] = []
    const push = (x: number) => {
      if (x >= 0 && x !== i && !out.includes(x)) out.push(x)
    }
    for (const d of this.topics[i].deeper ?? []) push(this.idx(d))
    for (const c of this.childIdx[i]) push(c)
    for (const d of this.dependentIdx[i]) push(d)
    return this.toTopics(out)
  }

  /** Typed relations (application, uses, derived_from, historical) around a topic. */
  typedRelations(id: string) {
    const i = this.idx(id)
    return i < 0 ? [] : this.typedIdx[i].map((r) => ({ topic: this.topics[r.other], type: r.type, outgoing: r.outgoing }))
  }

  inDomain(domain: string): Topic[] {
    return this.toTopics(this.byDomain.get(domain) ?? [])
  }

  withTag(tag: string): Topic[] {
    return this.toTopics(this.byTag.get(tag.toLowerCase()) ?? [])
  }

  /** Chain of ancestors from the domain down to (and including) `id`. */
  lineage(id: string): Topic[] {
    const out: Topic[] = []
    let t = this.get(id)
    for (let guard = 0; t && guard < 32; guard++) {
      out.unshift(t)
      t = this.get(t.parent)
    }
    return out
  }

  /** Degree — a cheap importance signal. */
  degree(i: number) {
    return this.adj[i].length
  }
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

function addUnique(list: number[], value: number) {
  if (!list.includes(value)) list.push(value)
}
