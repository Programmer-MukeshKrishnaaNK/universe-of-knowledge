import type { Topic } from '../data/schema'
import { KnowledgeGraph } from './graph'
import { estimateDomainRadius, layoutRegion, scaledAnchors, type LayoutTopic, type RegionLayoutInput, type RegionLayoutResult } from './layout'
import { SearchIndex } from './search'
import type { KnowledgeSource, UniverseManifest } from './source'
import { SpatialGrid } from './spatial'

type Vec3 = [number, number, number]

export interface RegionLoaded {
  region: string
  indices: number[]
}

/** Regions larger than this are laid out in a worker. */
const WORKER_THRESHOLD = 700

/**
 * The knowledge universe: the graph, where every concept lives, and the
 * indexes that answer "what is near / what matches / what connects".
 *
 * Loading is progressive: the manifest arrives first (a few hundred bytes),
 * then regions stream in by priority. Each region is laid out independently
 * (see layout.ts), inserted into the graph, the spatial index and the search
 * index, and announced so the renderer can ignite it.
 */
export class Universe {
  readonly graph = new KnowledgeGraph()
  readonly search = new SearchIndex()
  readonly spatial = new SpatialGrid(24)
  positions = new Float32Array(0)
  capacity = 0
  manifest: UniverseManifest | null = null
  anchors: Record<string, Vec3> = {}
  readonly domainRadius = new Map<string, number>()
  center: Vec3 = [0, 0, 0]
  /** Radius that contains every mapped domain — frames the overview for any dataset size. */
  extent = 200
  readonly loaded = new Set<string>()
  private source: KnowledgeSource | null = null
  private listeners = new Set<(e: RegionLoaded) => void>()
  private worker: Worker | null = null
  private jobs = new Map<number, (r: RegionLayoutResult) => void>()
  private nextJob = 0
  private loading = new Map<string, Promise<void>>()

  setSource(source: KnowledgeSource) {
    this.source = source
  }

  get sourceId() {
    return this.source?.id ?? 'none'
  }

  async init() {
    if (this.manifest) return this.manifest
    if (!this.source) throw new Error('Universe has no knowledge source')
    const m = await this.source.manifest()
    this.manifest = m
    this.capacity = m.total
    this.positions = new Float32Array(m.total * 3)
    this.anchors = scaledAnchors(Object.fromEntries(m.domains.map((d) => [d.id, d.count])))
    for (const d of m.domains) this.domainRadius.set(d.id, estimateDomainRadius(d.count) * 0.8)
    const mapped = m.domains.filter((d) => d.mapped)
    this.center = [0, 1, 2].map((k) => mapped.reduce((s, d) => s + (this.anchors[d.id]?.[k] ?? 0), 0) / Math.max(1, mapped.length)) as Vec3
    this.extent = Math.max(...mapped.map((d) => Math.hypot(...([0, 1, 2].map((k) => (this.anchors[d.id]?.[k] ?? 0) - this.center[k]) as Vec3)) + estimateDomainRadius(d.count)))
    return m
  }

  /** Which region a not-yet-loaded topic lives in, if the source can tell from its id. */
  regionFor(id: string): string | undefined {
    const i = this.graph.idx(id)
    if (i >= 0) return this.graph.topics[i].region ?? this.graph.topics[i].domain
    return this.source?.regionFor?.(id)
  }

  onRegion(listener: (e: RegionLoaded) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Load one region (idempotent — concurrent calls share the same work). */
  loadRegion(id: string): Promise<void> {
    if (this.loaded.has(id)) return Promise.resolve()
    const inFlight = this.loading.get(id)
    if (inFlight) return inFlight
    const p = this.doLoad(id).finally(() => this.loading.delete(id))
    this.loading.set(id, p)
    return p
  }

  /** Stream every region in priority order, yielding between regions. */
  async loadAll(onProgress?: (done: number, total: number) => void) {
    const regions = [...(this.manifest?.regions ?? [])].sort((a, b) => a.priority - b.priority)
    let done = 0
    for (const r of regions) {
      await this.loadRegion(r.id)
      onProgress?.(++done, regions.length)
      await new Promise((res) => setTimeout(res, 0))
    }
  }

  private async doLoad(id: string) {
    const chunk = await this.source!.region(id)
    const topics = chunk.topics
    const domainOfLocal = new Map(topics.map((t) => [t.id, t.domain]))
    const layoutTopics: LayoutTopic[] = topics.map((t) => ({
      id: t.id,
      parent: t.parent,
      level: t.level,
      domain: t.domain,
      bridges: bridgesOf(t, (ref) => domainOfLocal.get(ref) ?? chunk.externalDomains[ref]),
    }))
    const input: RegionLayoutInput = { topics: layoutTopics, anchors: this.anchors, seed: 7 }
    const result = topics.length > WORKER_THRESHOLD ? await this.layoutInWorker(input) : layoutRegion(input)

    const before = this.graph.size
    const indices = this.graph.addTopics(topics)
    if (this.graph.size > this.capacity) this.grow(this.graph.size)
    topics.forEach((t, k) => {
      const i = this.graph.idx(t.id)
      if (i < before) return // already present (duplicate across regions)
      this.positions[i * 3] = result.positions[k * 3]
      this.positions[i * 3 + 1] = result.positions[k * 3 + 1]
      this.positions[i * 3 + 2] = result.positions[k * 3 + 2]
    })
    this.spatial.insertAll(this.positions, indices)
    this.search.add(
      indices.map((i) => this.graph.topics[i]),
      indices,
      (i) => this.graph.degree(i),
    )
    const domain = topics[0]?.domain
    if (domain) this.domainRadius.set(domain, Math.max(result.radius, 6))
    this.loaded.add(id)
    for (const l of this.listeners) l({ region: id, indices })
  }

  private layoutInWorker(input: RegionLayoutInput): Promise<RegionLayoutResult> {
    if (typeof Worker === 'undefined') return Promise.resolve(layoutRegion(input))
    this.worker ??= new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (e: MessageEvent<{ job: number; positions: Float32Array; radius: number }>) => {
      this.jobs.get(e.data.job)?.({ positions: e.data.positions, radius: e.data.radius })
      this.jobs.delete(e.data.job)
    }
    const job = this.nextJob++
    return new Promise((resolve) => {
      this.jobs.set(job, resolve)
      this.worker!.postMessage({ job, input })
    })
  }

  private grow(size: number) {
    const next = new Float32Array(Math.ceil(size * 1.25) * 3)
    next.set(this.positions)
    this.positions = next
    this.capacity = Math.ceil(size * 1.25)
  }

  /** Release the layout worker (e.g. when leaving a stress test). */
  dispose() {
    this.worker?.terminate()
    this.worker = null
  }
}

function bridgesOf(t: Topic, domainOf: (id: string) => string | undefined) {
  const refs = [...(t.prerequisites ?? []), ...(t.related ?? []), ...(t.relations ?? []).map((r) => r.target)]
  const out = new Set<string>()
  for (const r of refs) {
    const d = domainOf(r)
    if (d && d !== t.domain) out.add(d)
  }
  return [...out]
}
