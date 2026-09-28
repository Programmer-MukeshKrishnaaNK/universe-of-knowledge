import assert from 'node:assert/strict'
import { test } from 'node:test'
import { allTopics } from '../src/data'
import { KnowledgeGraph } from '../src/knowledge/graph'

test('curated graph: every relationship resolves', () => {
  const g = new KnowledgeGraph(allTopics)
  assert.equal(g.size, 99)
  assert.equal(g.edgeCount, 344)
  assert.equal(g.pendingCount, 0)
})

test('region load order never changes the graph', () => {
  const byDomain = new Map<string, typeof allTopics>()
  for (const t of allTopics) byDomain.set(t.domain, [...(byDomain.get(t.domain) ?? []), t])
  const regions = [...byDomain.values()]
  const pairs = (g: KnowledgeGraph) =>
    new Set(Array.from({ length: g.edgeCount }, (_, e) => {
      const r = g.relationship(e)
      return [r.source, r.target].sort().join('|') + ':' + r.type
    }))
  const a = new KnowledgeGraph()
  for (const r of regions) a.addTopics(r)
  const b = new KnowledgeGraph()
  for (const r of [...regions].reverse()) b.addTopics(r)
  assert.equal(a.pendingCount, 0)
  assert.equal(b.pendingCount, 0)
  assert.deepEqual(pairs(a), pairs(b))
})

test('relationships to unloaded concepts wait, then connect', () => {
  const g = new KnowledgeGraph()
  const physics = allTopics.filter((t) => t.domain === 'physics')
  g.addTopics(physics)
  assert.ok(g.pendingCount > 0, 'cross-domain prerequisites are pending before mathematics loads')
  const before = g.edgeCount
  g.addTopics(allTopics.filter((t) => t.domain === 'mathematics'))
  assert.ok(g.edgeCount > before)
  assert.ok(g.edgeBetween(g.idx('linear-algebra'), g.idx('quantum-mechanics')) >= 0)
})

test('indexes answer structural questions without scanning', () => {
  const g = new KnowledgeGraph(allTopics)
  assert.ok(g.children('quantum-mechanics').some((t) => t.id === 'entanglement'))
  assert.ok(g.dependents('superposition').some((t) => t.id === 'entanglement'))
  assert.ok(g.related('entanglement').some((t) => t.id === 'bells-theorem'))
  // Associations are symmetric: Light lists Astronomy as related; Astronomy does not list Light.
  assert.ok(!(g.get('astronomy')!.related ?? []).includes('light'))
  assert.ok(g.related('astronomy').some((t) => t.id === 'light'), 'associations are symmetric')
  assert.ok(g.inDomain('astronomy').some((t) => t.id === 'black-holes'))
  assert.deepEqual(g.lineage('bells-theorem').map((t) => t.id), ['physics', 'quantum-physics', 'quantum-mechanics', 'bells-theorem'])
  // One rendered edge per pair; the most structural relationship wins (hierarchy over prerequisite).
  assert.equal(g.typeOf(g.edgeBetween(g.idx('linear-algebra'), g.idx('vectors'))), 'contains')
  // Cross-domain relationships are marked.
  assert.equal(g.edgeCross[g.edgeBetween(g.idx('linear-algebra'), g.idx('quantum-mechanics'))], 1)
})
