/**
 * DEVELOPMENT ONLY — a synthetic universe for stress testing the engine.
 *
 * Never imported by production code paths (see knowledge/sources/select.ts,
 * guarded by import.meta.env.DEV). Every concept is clearly marked synthetic.
 *
 * Shape mimics real knowledge: domains → fields → clusters → concepts, with
 * prerequisite chains inside clusters (always pointing to earlier concepts,
 * so they are acyclic), associations within fields, and a small share of
 * cross-domain bridges. Generation is deterministic per (N, domain).
 */
import type { DomainId, Topic } from '../data/schema'
import { mulberry32 } from '../lib/random'
import type { KnowledgeSource, RegionChunk, UniverseManifest } from '../knowledge/source'

const DOMAINS: { id: DomainId; title: string; weight: number; nouns: string[] }[] = [
  { id: 'mathematics', title: 'Mathematics', weight: 0.2, nouns: ['Theorem', 'Lattice', 'Operator', 'Manifold', 'Series', 'Group', 'Measure', 'Invariant'] },
  { id: 'physics', title: 'Physics', weight: 0.2, nouns: ['Field', 'Wave', 'Symmetry', 'Resonance', 'Flux', 'Oscillator', 'Coupling', 'Current'] },
  { id: 'computer-science', title: 'Computer Science', weight: 0.14, nouns: ['Algorithm', 'Protocol', 'Automaton', 'Encoding', 'Scheduler', 'Graph', 'Cipher'] },
  { id: 'astronomy', title: 'Astronomy', weight: 0.1, nouns: ['Nebula', 'Orbit', 'Cluster', 'Halo', 'Disk', 'Survey', 'Transit'] },
  { id: 'chemistry', title: 'Chemistry', weight: 0.1, nouns: ['Bond', 'Catalyst', 'Isomer', 'Orbital', 'Reaction', 'Ligand', 'Polymer'] },
  { id: 'biology', title: 'Biology', weight: 0.1, nouns: ['Pathway', 'Receptor', 'Genome', 'Tissue', 'Enzyme', 'Membrane'] },
  { id: 'earth-science', title: 'Earth Science', weight: 0.06, nouns: ['Stratum', 'Current', 'Cycle', 'Front', 'Basin', 'Plate'] },
  { id: 'neuroscience', title: 'Neuroscience', weight: 0.05, nouns: ['Circuit', 'Synapse', 'Cortex', 'Rhythm', 'Signal'] },
  { id: 'engineering', title: 'Engineering', weight: 0.05, nouns: ['Controller', 'Truss', 'Filter', 'Actuator', 'Turbine', 'Sensor'] },
]
const SYLLABLES = ['va', 'ren', 'tho', 'lix', 'mar', 'qua', 'sel', 'dor', 'ine', 'ka', 'lum', 'ost', 'rae', 'vin', 'ze', 'nor', 'ph', 'ta', 'cal', 'eon']

export class SyntheticSource implements KnowledgeSource {
  readonly id: string
  private counts: Record<string, number> = {}

  constructor(readonly total: number) {
    this.id = `synthetic-${total}`
    let remaining = total
    DOMAINS.forEach((d, k) => {
      const n = k === DOMAINS.length - 1 ? remaining : Math.max(4, Math.round(total * d.weight))
      this.counts[d.id] = n
      remaining -= n
    })
  }

  async manifest(): Promise<UniverseManifest> {
    return {
      dataset: this.id,
      version: 'dev',
      total: this.total,
      domains: DOMAINS.map((d) => ({ id: d.id, title: d.title, mapped: true, count: this.counts[d.id] })),
      regions: DOMAINS.map((d, k) => ({ id: d.id, domain: d.id, count: this.counts[d.id], priority: k })),
    }
  }

  regionFor(id: string) {
    const m = id.match(/^syn:([a-z-]+):/)
    return m ? m[1] : undefined
  }

  async region(id: string): Promise<RegionChunk> {
    const d = DOMAINS.find((x) => x.id === id)!
    const n = this.counts[id]
    const rand = mulberry32(hash(`${this.total}:${id}`))
    const word = () => {
      const parts = 2 + Math.floor(rand() * 2)
      let w = ''
      for (let k = 0; k < parts; k++) w += SYLLABLES[Math.floor(rand() * SYLLABLES.length)]
      return w.charAt(0).toUpperCase() + w.slice(1)
    }
    const name = () => `${word()} ${d.nouns[Math.floor(rand() * d.nouns.length)]}`
    const topics: Topic[] = []
    const base = (tid: string, level: 0 | 1 | 2 | 3, parent: string | undefined, title: string): Topic => ({
      id: tid,
      title,
      domain: d.id,
      level,
      parent,
      difficulty: (['beginner', 'beginner', 'intermediate', 'advanced'] as const)[level],
      short: `Synthetic ${['domain', 'field', 'cluster', 'concept'][level]} for stress testing.`,
      simple: 'Generated for development stress tests only — not real knowledge.',
      tags: ['synthetic'],
      provenance: { source: 'Synthetic stress-test generator (development only)', confidence: 0 },
    })

    topics.push({ ...base(d.id, 0, undefined, d.title) })
    const rest = n - 1
    const fields = Math.max(3, Math.round(Math.sqrt(rest) / 6))
    const clustersPerField = Math.max(2, Math.round(Math.sqrt(rest / fields) / 2.2))
    const clusterCount = fields * clustersPerField
    const conceptCount = Math.max(0, rest - fields - clusterCount)
    const fieldIds: string[] = []
    const clusterIds: string[][] = []
    for (let f = 0; f < fields; f++) {
      const fid = `syn:${id}:f${f}`
      fieldIds.push(fid)
      topics.push(base(fid, 1, d.id, `${name()} Studies`))
      clusterIds.push([])
      for (let c = 0; c < clustersPerField; c++) {
        const cid = `syn:${id}:f${f}c${c}`
        clusterIds[f].push(cid)
        const t = base(cid, 2, fid, name())
        if (c > 0 && rand() < 0.7) t.prerequisites = [clusterIds[f][Math.floor(rand() * c)]]
        topics.push(t)
      }
    }
    // Concepts: spread across clusters; prerequisites point to earlier concepts in the same cluster.
    const members: string[][] = clusterIds.flat().map(() => [])
    const flatClusters = clusterIds.flat()
    for (let k = 0; k < conceptCount; k++) {
      const ci = Math.floor(Math.pow(rand(), 1.3) * flatClusters.length) // some clusters are richer than others
      const cid = flatClusters[ci]
      const tid = `syn:${id}:k${k}`
      const t = base(tid, 3, cid, name())
      const earlier = members[ci]
      if (earlier.length) {
        const pre = new Set<string>()
        const count = rand() < 0.35 ? 2 : 1
        for (let p = 0; p < count; p++) pre.add(earlier[Math.floor(Math.pow(rand(), 0.7) * earlier.length)])
        t.prerequisites = [...pre]
      }
      if (earlier.length > 3 && rand() < 0.45) t.related = [earlier[Math.floor(rand() * earlier.length)]]
      // Cross-domain bridges: a small share of concepts relate to a concept in another domain.
      if (rand() < 0.03) {
        const other = DOMAINS[Math.floor(rand() * DOMAINS.length)]
        if (other.id !== id) {
          const on = this.counts[other.id]
          const target = `syn:${other.id}:k${Math.floor(rand() * Math.max(1, on * 0.8))}`
          t.related = [...(t.related ?? []), target]
        }
      }
      earlier.push(tid)
      topics.push(t)
    }
    const externalDomains: Record<string, string> = {}
    for (const t of topics) for (const r of t.related ?? []) if (!r.startsWith(`syn:${id}:`)) externalDomains[r] = this.regionFor(r) ?? ''
    return { id, topics, externalDomains }
  }
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
