import { allTopics } from '../../data'
import type { KnowledgeSource, RegionChunk, UniverseManifest } from '../source'

/**
 * The curated universe, bundled with the app and served region by region —
 * through exactly the same interface a streamed dataset would use.
 */
export class BundledSource implements KnowledgeSource {
  readonly id = 'curated'
  private domainOf = new Map(allTopics.map((t) => [t.id, t.domain]))

  async manifest(): Promise<UniverseManifest> {
    const domains = allTopics.filter((t) => t.level === 0)
    const count = (d: string) => allTopics.filter((t) => t.domain === d).length
    return {
      dataset: 'curated',
      version: '1',
      total: allTopics.length,
      domains: domains.map((d) => ({ id: d.domain, title: d.title, mapped: d.mapped !== false, count: count(d.domain) })),
      regions: domains.map((d, k) => ({ id: d.domain, domain: d.domain, count: count(d.domain), priority: d.mapped === false ? 10 + k : k })),
    }
  }

  async region(id: string): Promise<RegionChunk> {
    const topics = allTopics.filter((t) => (t.region ?? t.domain) === id)
    const externalDomains: Record<string, string> = {}
    for (const t of topics)
      for (const ref of [...(t.prerequisites ?? []), ...(t.related ?? []), ...(t.relations ?? []).map((r) => r.target)]) {
        const d = this.domainOf.get(ref)
        if (d && d !== t.domain) externalDomains[ref] = d
      }
    return { id, topics, externalDomains }
  }
}
