import type { Topic } from '../data/schema'

/**
 * How knowledge reaches the universe.
 *
 *   manifest  — tiny global metadata: domains, regions, counts. Loaded first.
 *   region    — one loadable chunk: its topics and their relationships.
 *
 * The universe streams regions in priority order and never needs the whole
 * dataset in memory up front. A source can be the bundled curated data, a
 * static JSON export, or (later) an API — the engine does not care.
 */

export interface DomainManifest {
  id: string
  title: string
  mapped: boolean
  count: number
  /** Optional precomputed radius (from an offline layout); otherwise estimated from the count. */
  radius?: number
}

export interface RegionManifest {
  id: string
  domain: string
  count: number
  /** Lower loads first. */
  priority: number
}

export interface UniverseManifest {
  /** Dataset identity and version (see ingestion). */
  dataset: string
  version: string
  /** Content hash of the knowledge — exactly which knowledge produced this experience. */
  hash?: string
  total: number
  domains: DomainManifest[]
  regions: RegionManifest[]
}

export interface RegionChunk {
  id: string
  topics: Topic[]
  /** Domain of every topic referenced from this region but living elsewhere (for layout leaning). */
  externalDomains: Record<string, string>
}

export interface KnowledgeSource {
  readonly id: string
  manifest(): Promise<UniverseManifest>
  region(id: string): Promise<RegionChunk>
  /** Optional: which region an id belongs to without loading it (lets journeys request regions on demand). */
  regionFor?(id: string): string | undefined
}
