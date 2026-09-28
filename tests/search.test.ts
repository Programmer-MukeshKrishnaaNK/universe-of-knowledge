import assert from 'node:assert/strict'
import { test } from 'node:test'
import { allTopics } from '../src/data'
import { SearchIndex } from '../src/knowledge/search'

const s = new SearchIndex()
s.add(allTopics, allTopics.map((_, i) => i))
const top = (q: string) => s.query(q, 3)[0]?.topic.id

test('exact, alias and plural matches', () => {
  assert.equal(top('black holes'), 'black-holes')
  assert.equal(top('Bell’s theorem'), 'bells-theorem')
  assert.equal(top('e=mc2'), 'mass-energy')
})

test('prefix and typo tolerance', () => {
  assert.equal(top('eigen'), 'eigenvalues')
  assert.equal(top('blak hole'), 'black-holes')
  assert.ok(s.query('quantm', 5).some((h) => h.topic.id === 'quantum-mechanics'))
})

test('descriptions contribute weakly', () => {
  assert.equal(top('chance'), 'probability')
})

test('nothing for nonsense or empty queries', () => {
  assert.deepEqual(s.query('', 5), [])
  assert.deepEqual(s.query('zzxqv', 5), [])
})
