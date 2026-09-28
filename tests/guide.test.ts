import assert from 'node:assert/strict'
import { test } from 'node:test'
import { allTopics } from '../src/data'
import { KnowledgeGraph } from '../src/knowledge/graph'
import { GuideKnowledge } from '../src/knowledge/guide'
import { buildMessages } from '../server/ai/prompt'

const graph = new KnowledgeGraph(allTopics)
const kg = new GuideKnowledge(graph)

test('the guide reads routes, bridges and discoveries as detached data', () => {
  const before = { version: graph.version, edges: graph.edgeCount, nodes: graph.topics.length }
  const ctx = kg.context('quantum-mechanics')!
  assert.ok(ctx.prerequisites.length && ctx.discoveries.length)
  for (const d of ctx.discoveries) assert.ok(d.reason && graph.get(d.id))
  const route = kg.route('linear-algebra', 'quantum-mechanics')
  assert.equal(route.at(-1)?.id, 'quantum-mechanics')
  assert.ok(kg.bridges('quantum-mechanics').every((b) => b.from.domain !== b.to.domain))
  // Mutating what the guide received never reaches the graph.
  ctx.topic.title = 'changed'
  ctx.prerequisites.length = 0
  assert.notEqual(graph.get('quantum-mechanics')!.title, 'changed')
  assert.ok(graph.prerequisites('quantum-mechanics').length > 0)
  assert.deepEqual({ version: graph.version, edges: graph.edgeCount, nodes: graph.topics.length }, before)
})

test('the "next" prompt offers only real ids, with discovery reasons', () => {
  const topic = graph.get('quantum-mechanics')!
  const [system] = buildMessages(graph, topic, 'next', { depth: 'simple', known: [], history: [] })
  assert.match(system.content, /WORTH DISCOVERING/)
  const listed = [...system.content.split('CONNECTED TOPICS (id — title)\n')[1].split('\n\n')[0].matchAll(/^([a-z0-9-]+) — /gm)].map((m) => m[1])
  for (const d of kg.discoveries(topic.id)) assert.ok(listed.includes(d.id), `${d.id} is linkable`)
  for (const id of listed) assert.ok(graph.get(id), `${id} exists`)
})
