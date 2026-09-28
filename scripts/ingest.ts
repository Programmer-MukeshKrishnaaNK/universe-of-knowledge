/**
 * Ingest a knowledge dataset:
 *
 *   npm run ingest -- path/to/dataset.json [--out .datasets]
 *
 *  1. check the format
 *  2. stamp missing provenance from the dataset's declared sources
 *  3. validate against the curated universe (references, cycles, duplicates…)
 *  4. write versioned region chunks + a manifest with a content hash
 *  5. diff against the previous version (added / changed / removed)
 *
 * Nothing is written if validation finds errors.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { allTopics } from '../src/data'
import { normalize } from '../src/knowledge/search'
import { DATASET_FORMAT, type BuiltManifestInfo, type DatasetFile } from '../src/knowledge/ingest/format'
import { contentHash, validateTopics } from '../src/knowledge/validate'
import type { RegionChunk, UniverseManifest } from '../src/knowledge/source'
import type { Topic } from '../src/data/schema'

const args = process.argv.slice(2)
const input = args.find((a) => !a.startsWith('--'))
const outRoot = args.includes('--out') ? args[args.indexOf('--out') + 1] : '.datasets'
if (!input) {
  console.error('usage: npm run ingest -- <dataset.json> [--out <dir>]')
  process.exit(2)
}

const file = JSON.parse(readFileSync(input, 'utf8')) as DatasetFile
if (file.format !== DATASET_FORMAT) {
  console.error(`✗ unsupported format "${file.format}" (expected ${DATASET_FORMAT})`)
  process.exit(1)
}
const { dataset } = file
if (!dataset?.id || !dataset.version || !dataset.sources?.length) {
  console.error('✗ dataset needs an id, a version and at least one declared source')
  process.exit(1)
}

// Provenance: only ever the sources the dataset itself declared.
const primary = dataset.sources[0]
const topics = file.topics.map((t) => ({
  ...t,
  provenance: t.provenance ?? { source: primary.title, url: primary.url, license: primary.license ?? dataset.license, reviewed: primary.retrieved, version: dataset.version },
}))

const curatedIds = new Set(allTopics.map((t) => t.id))
const existingNames = new Map<string, string>()
for (const t of allTopics) for (const n of [t.title, ...(t.aliases ?? [])]) existingNames.set(normalize(n), t.id)
const clash = topics.filter((t) => curatedIds.has(t.id))
const issues = validateTopics(topics, { externalIds: curatedIds, existingNames, requireProvenance: true })
for (const t of clash) issues.push({ severity: 'error', code: 'duplicate-id', id: t.id, message: 'id already exists in the curated universe' })

const errors = issues.filter((i) => i.severity === 'error')
for (const i of issues) console[i.severity === 'error' ? 'error' : 'warn'](`  ${i.severity === 'error' ? '✗' : '!'} ${i.id}: ${i.message}`)
if (errors.length) {
  console.error(`✗ ${errors.length} error(s) — nothing written.`)
  process.exit(1)
}

// Versioned output. Content identity ignores release metadata (the stamped version), so a
// topic only counts as "changed" when its knowledge changed.
const topicHash = (t: Topic) => contentHash({ ...t, provenance: t.provenance ? { ...t.provenance, version: undefined } : undefined })
const hash = contentHash(topics.map(topicHash))
const dir = join(outRoot, dataset.id, dataset.version)
const previousVersions = existsSync(join(outRoot, dataset.id)) ? readdirSync(join(outRoot, dataset.id)).filter((v) => v !== dataset.version).sort() : []
let previous: BuiltManifestInfo['previous']
let changes: BuiltManifestInfo['changes']
const last = previousVersions[previousVersions.length - 1]
if (last) {
  const prevManifest = JSON.parse(readFileSync(join(outRoot, dataset.id, last, 'manifest.json'), 'utf8')) as UniverseManifest & { build: BuiltManifestInfo }
  const prevTopics = new Map<string, string>()
  for (const r of prevManifest.regions) {
    const chunk = JSON.parse(readFileSync(join(outRoot, dataset.id, last, 'regions', `${r.id}.json`), 'utf8')) as RegionChunk
    for (const t of chunk.topics) prevTopics.set(t.id, topicHash(t))
  }
  const now = new Map(topics.map((t) => [t.id, topicHash(t)]))
  changes = {
    added: [...now.keys()].filter((id) => !prevTopics.has(id)),
    changed: [...now.keys()].filter((id) => prevTopics.has(id) && prevTopics.get(id) !== now.get(id)),
    removed: [...prevTopics.keys()].filter((id) => !now.has(id)),
  }
  previous = { version: last, hash: prevManifest.build.hash }
}

const regions = new Map<string, typeof topics>()
for (const t of topics) {
  const r = t.region ?? t.domain
  regions.set(r, [...(regions.get(r) ?? []), t])
}
mkdirSync(join(dir, 'regions'), { recursive: true })
const domainOf = new Map([...allTopics, ...topics].map((t) => [t.id, t.domain]))
for (const [region, list] of regions) {
  const externalDomains: Record<string, string> = {}
  for (const t of list)
    for (const ref of [...(t.prerequisites ?? []), ...(t.related ?? []), ...(t.relations ?? []).map((x) => x.target)]) {
      const d = domainOf.get(ref)
      if (d && d !== t.domain) externalDomains[ref] = d
    }
  const chunk: RegionChunk = { id: region, topics: list, externalDomains }
  writeFileSync(join(dir, 'regions', `${region}.json`), JSON.stringify(chunk))
}
const build: BuiltManifestInfo = { dataset: dataset.id, version: dataset.version, hash, builtAt: new Date().toISOString(), previous, changes }
const domains = [...new Set(topics.map((t) => t.domain))]
const manifest: UniverseManifest & { build: BuiltManifestInfo } = {
  dataset: dataset.id,
  version: dataset.version,
  total: topics.length,
  domains: domains.map((d) => ({ id: d, title: d, mapped: true, count: topics.filter((t) => t.domain === d).length })),
  regions: [...regions].map(([id, list], k) => ({ id, domain: list[0].domain, count: list.length, priority: k })),
  build,
}
writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(`✓ ${dataset.id}@${dataset.version} · ${topics.length} topics · ${regions.size} region(s) · content ${hash} → ${dir}`)
if (changes) console.log(`  since ${last}: +${changes.added.length} ~${changes.changed.length} −${changes.removed.length}`)
