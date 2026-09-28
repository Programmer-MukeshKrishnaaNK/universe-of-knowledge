import type { Topic } from '../../data/schema'

/**
 * The import format for knowledge datasets.
 *
 *   {
 *     "format": "uok.dataset/1",
 *     "dataset": { "id", "title", "version", "sources": [...] },
 *     "topics": [ Topic, ... ]
 *   }
 *
 * Relationships live on topics (prerequisites, related, typed `relations`),
 * each of which may carry its own provenance. Topics without provenance
 * inherit the dataset's declared source — nothing is ever attributed to a
 * source the dataset did not declare.
 */
export const DATASET_FORMAT = 'uok.dataset/1'

export interface DatasetSource {
  id: string
  title: string
  url?: string
  license?: string
  /** ISO date the source was retrieved. */
  retrieved?: string
}

export interface DatasetFile {
  format: typeof DATASET_FORMAT
  dataset: {
    id: string
    title: string
    /** Semantic version of this dataset release. */
    version: string
    description?: string
    license?: string
    sources: DatasetSource[]
  }
  topics: Topic[]
}

/** What `npm run ingest` writes next to the region chunks. */
export interface BuiltManifestInfo {
  dataset: string
  version: string
  /** Content hash of the topics — the precise identity of the knowledge. */
  hash: string
  builtAt: string
  previous?: { version: string; hash: string }
  changes?: { added: string[]; changed: string[]; removed: string[] }
}
