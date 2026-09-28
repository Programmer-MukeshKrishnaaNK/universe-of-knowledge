import assert from 'node:assert/strict'
import { test } from 'node:test'
import { allTopics } from '../src/data'
import type { Topic } from '../src/data/schema'
import { discover } from '../src/knowledge/explore'
import { KnowledgeGraph } from '../src/knowledge/graph'
import { bridgesBetween, crossDomainRoute, journeyRoute, learningPath, meaningfulPath, shortestPath } from '../src/knowledge/traverse'

const g = new KnowledgeGraph(allTopics)
const ids = (list: number[]) => list.map((i) => g.topics[i].id)

test('cross-domain: Linear Algebra leads directly to Quantum Mechanics', () => {
  assert.deepEqual(journeyRoute(g, 'linear-algebra', 'quantum-mechanics'), ['linear-algebra', 'quantum-mechanics'])
})

test('deep route: Quantum Mechanics → Bell’s Theorem is reachable and meaningful', () => {
  const p = ids(meaningfulPath(g, g.idx('quantum-mechanics'), g.idx('bells-theorem')))
  assert.equal(p[0], 'quantum-mechanics')
  assert.equal(p[p.length - 1], 'bells-theorem')
  assert.ok(p.length <= 3)
})

test('journeys from the overview follow the hierarchy', () => {
  assert.deepEqual(journeyRoute(g, null, 'black-holes'), ['astronomy', 'black-holes'])
  const physicsToBlackHoles = journeyRoute(g, 'special-relativity', 'black-holes')
  assert.equal(physicsToBlackHoles[physicsToBlackHoles.length - 1], 'black-holes')
})

test('shortest path agrees on reachability', () => {
  assert.ok(shortestPath(g, g.idx('algebra'), g.idx('black-holes')).length > 1)
})

test('learning path orders prerequisites before what depends on them', () => {
  const path = learningPath(g, 'bells-theorem', () => undefined).map((t) => t.id)
  const at = (id: string) => path.indexOf(id)
  assert.ok(at('superposition') >= 0 && at('entanglement') >= 0)
  assert.ok(at('superposition') < at('entanglement'))
  assert.ok(!path.includes('bells-theorem'))
  // Known prerequisites are skipped.
  const known = learningPath(g, 'entanglement', (id) => (id === 'probability' ? 'understood' : undefined)).map((t) => t.id)
  assert.ok(!known.includes('probability'))
})

test('learning path is cycle-safe', () => {
  const base = { domain: 'mathematics', difficulty: 'beginner', short: 's', simple: 's' } as const
  const cyclic = new KnowledgeGraph([
    { ...base, id: 'd', title: 'D', level: 0 } as Topic,
    { ...base, id: 'a', title: 'A', level: 1, parent: 'd', prerequisites: ['b'] } as Topic,
    { ...base, id: 'b', title: 'B', level: 1, parent: 'd', prerequisites: ['a'] } as Topic,
  ])
  assert.doesNotThrow(() => learningPath(cyclic, 'a', () => undefined))
})

test('bridges between domains are found and routable', () => {
  const b = bridgesBetween(g, 'mathematics', 'physics')
  assert.ok(b.length > 0)
  assert.ok(b.every((x) => x.from.domain === 'mathematics' && x.to.domain === 'physics'))
  const route = crossDomainRoute(g, 'mathematics', 'physics')
  assert.equal(route[0], 'mathematics')
  assert.equal(route[route.length - 1], 'physics')
})

test('discovery explains itself and prefers the unexpected', () => {
  const d = discover(g, g.idx('linear-algebra'), { know: () => undefined })
  assert.ok(d.length > 0)
  assert.ok(d.every((x) => x.reason && x.topic.id !== 'linear-algebra'))
  assert.ok(d.some((x) => x.reason === 'bridge'), 'a cross-domain bridge is among the suggestions')
})
