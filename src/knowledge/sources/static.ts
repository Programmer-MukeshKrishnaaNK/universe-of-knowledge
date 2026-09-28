import type { KnowledgeSource, RegionChunk, UniverseManifest } from '../source'

/**
 * A universe served as static JSON (the output of `npm run ingest`):
 *   <base>/manifest.json
 *   <base>/regions/<region>.json
 * Region files are fetched only when the region is needed.
 */
export class StaticSource implements KnowledgeSource {
  readonly id: string
  constructor(private base: string) {
    this.id = `static:${base}`
  }

  private async json<T>(path: string): Promise<T> {
    const res = await fetch(`${this.base.replace(/\/$/, '')}/${path}`)
    if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`)
    return (await res.json()) as T
  }

  manifest() {
    return this.json<UniverseManifest>('manifest.json')
  }

  region(id: string) {
    return this.json<RegionChunk>(`regions/${encodeURIComponent(id)}.json`)
  }
}
