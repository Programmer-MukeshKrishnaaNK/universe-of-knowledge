import type { Relationship, RelationshipType, Topic } from '../data/schema'

export const EDGE_TYPE_CODE: Record<RelationshipType, number> = {
  contains: 0,
  prerequisite: 1,
  related: 2,
  bridge: 3,
}

/**
 * The normalised, index-based knowledge graph.
 *
 * Topics are addressed by dense integer index so the renderer can keep all
 * per-node / per-edge state in typed arrays (GPU-friendly, cache-friendly,
 * and trivially scalable to very large graphs).
 */
export class KnowledgeGraph {
  readonly topics: Topic[]
  readonly index = new Map<string, number>()
  readonly relationships: Relationship[] = []

  /** Edge arrays — edge i connects edgeSource[i] → edgeTarget[i]. */
  readonly edgeSource: Int32Array
  readonly edgeTarget: Int32Array
  readonly edgeType: Uint8Array
  readonly edgeStrength: Float32Array

  /** Adjacency: for node n, neighbours are adj[n] (edge indices). */
  readonly adj: number[][]

  constructor(topics: Topic[]) {
    this.topics = topics
    topics.forEach((t, i) => this.index.set(t.id, i))

    const seen = new Map<string, number>()
    const add = (source: string, target: string, type: RelationshipType, strength: number) => {
      if (source === target || !this.index.has(source) || !this.index.has(target)) return
      const key = source < target ? `${source}|${target}` : `${target}|${source}`
      const existing = seen.get(key)
      if (existing !== undefined) {
        // Keep the most structural relationship between a pair.
        const r = this.relationships[existing]
        if (EDGE_TYPE_CODE[type] < EDGE_TYPE_CODE[r.type]) this.relationships[existing] = { source, target, type, strength }
        return
      }
      seen.set(key, this.relationships.length)
      this.relationships.push({ source, target, type, strength })
    }

    for (const t of topics) {
      if (t.parent) add(t.parent, t.id, 'contains', 1)
    }
    for (const t of topics) {
      for (const p of t.prerequisites ?? []) add(p, t.id, 'prerequisite', 0.8)
    }
    for (const t of topics) {
      for (const r of t.related ?? []) {
        const other = this.get(r)
        if (!other) continue
        add(t.id, r, other.domain === t.domain ? 'related' : 'bridge', 0.5)
      }
    }

    const m = this.relationships.length
    this.edgeSource = new Int32Array(m)
    this.edgeTarget = new Int32Array(m)
    this.edgeType = new Uint8Array(m)
    this.edgeStrength = new Float32Array(m)
    this.adj = topics.map(() => [])
    this.relationships.forEach((r, i) => {
      const s = this.index.get(r.source)!
      const t = this.index.get(r.target)!
      this.edgeSource[i] = s
      this.edgeTarget[i] = t
      this.edgeType[i] = EDGE_TYPE_CODE[r.type]
      this.edgeStrength[i] = r.strength
      this.adj[s].push(i)
      this.adj[t].push(i)
    })
  }

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

  children(id: string): Topic[] {
    return this.topics.filter((t) => t.parent === id)
  }

  /** Topics that list `id` as a prerequisite. */
  dependents(id: string): Topic[] {
    return this.topics.filter((t) => t.prerequisites?.includes(id))
  }

  prerequisites(id: string): Topic[] {
    return (this.get(id)?.prerequisites ?? []).map((p) => this.get(p)).filter(Boolean) as Topic[]
  }

  related(id: string): Topic[] {
    const t = this.get(id)
    if (!t) return []
    const out = new Set<string>(t.related ?? [])
    // Relationships are symmetric even when authored on one side only.
    for (const o of this.topics) if (o.related?.includes(id)) out.add(o.id)
    if (t.parent) out.add(t.parent)
    for (const p of t.prerequisites ?? []) out.delete(p)
    out.delete(id)
    return [...out].map((x) => this.get(x)).filter(Boolean) as Topic[]
  }

  /** Where to go after understanding `id`: explicit, then children, then dependents. */
  deeper(id: string): Topic[] {
    const t = this.get(id)
    if (!t) return []
    const out: string[] = []
    const push = (x: string) => {
      if (x !== id && !out.includes(x)) out.push(x)
    }
    for (const d of t.deeper ?? []) push(d)
    for (const c of this.children(id)) push(c.id)
    for (const d of this.dependents(id)) push(d.id)
    return out.map((x) => this.get(x)).filter(Boolean) as Topic[]
  }

  /** Breadth-first shortest path through the graph (undirected). */
  path(fromId: string, toId: string): string[] {
    const from = this.idx(fromId)
    const to = this.idx(toId)
    if (from < 0 || to < 0) return []
    if (from === to) return [fromId]
    const prev = new Int32Array(this.size).fill(-1)
    prev[from] = from
    const queue = [from]
    while (queue.length) {
      const n = queue.shift()!
      // Prefer structural edges first so routes follow the hierarchy.
      const edges = [...this.adj[n]].sort((a, b) => this.edgeType[a] - this.edgeType[b])
      for (const e of edges) {
        const o = this.other(e, n)
        if (prev[o] !== -1) continue
        prev[o] = n
        if (o === to) {
          const out = [to]
          let c = to
          while (c !== from) {
            c = prev[c]
            out.push(c)
          }
          return out.reverse().map((i) => this.topics[i].id)
        }
        queue.push(o)
      }
    }
    return [fromId, toId]
  }

  edgeBetween(a: number, b: number): number {
    for (const e of this.adj[a]) if (this.other(e, a) === b) return e
    return -1
  }

  /** Chain of ancestors from the domain down to (and including) `id`. */
  lineage(id: string): Topic[] {
    const out: Topic[] = []
    let t = this.get(id)
    while (t) {
      out.unshift(t)
      t = this.get(t.parent)
    }
    return out
  }
}
