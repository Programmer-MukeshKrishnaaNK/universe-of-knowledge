import assert from 'node:assert/strict'
import { test } from 'node:test'
import { allTopics, papers } from '../src/data'
import type { Topic } from '../src/data/schema'
import { recommend, refineWithFrameTime, type DeviceSignals } from '../src/engine/quality'
import { contentHash, validateTopics } from '../src/knowledge/validate'

test('the curated universe passes validation', () => {
  assert.deepEqual(validateTopics(allTopics, { papers }).filter((i) => i.severity === 'error'), [])
})

test('validation catches malformed knowledge', () => {
  const base = { domain: 'mathematics', difficulty: 'beginner', short: 's', simple: 's' }
  const bad = [
    { ...base, id: 'm', title: 'M', level: 0 },
    { ...base, id: 'x', title: 'X', level: 1, parent: 'm', prerequisites: ['y'] },
    { ...base, id: 'y', title: 'Y', level: 1, parent: 'm', prerequisites: ['x', 'ghost'] },
    { ...base, id: 'x', title: 'X again', level: 1, parent: 'm' },
    { ...base, id: 'z', title: 'Z', level: 2 },
    { ...base, id: 'w', title: 'W', level: 1, parent: 'm', domain: 'alchemy' },
  ] as unknown as Topic[]
  const codes = new Set(validateTopics(bad).map((i) => i.code))
  for (const c of ['duplicate-id', 'prerequisite-cycle', 'missing-reference', 'orphan', 'invalid-domain']) assert.ok(codes.has(c as never), c)
})

test('content hash is stable and order-insensitive for object keys', () => {
  assert.equal(contentHash({ a: 1, b: [2, 3] }), contentHash({ b: [2, 3], a: 1 }))
  assert.notEqual(contentHash({ a: 1 }), contentHash({ a: 2 }))
})

test('quality recommendation stays conservative', () => {
  const s: DeviceSignals = { cores: 8, memoryGB: 8, compact: false, pixels: 2_000_000, software: false, gpuClass: 'apple', maxTextureSize: 16384 }
  assert.equal(recommend(s), 'high')
  assert.equal(recommend({ ...s, software: true }), 'low')
  assert.equal(recommend({ ...s, compact: true, memoryGB: 3 }), 'low')
  assert.equal(recommend({ ...s, cores: 4 }), 'medium')
  assert.notEqual(recommend({ ...s, gpuClass: 'discrete', cores: 32, memoryGB: 64 }), 'max')
  assert.equal(refineWithFrameTime('high', 16.7), 'high')
  assert.equal(refineWithFrameTime('high', 25), 'medium')
  assert.equal(refineWithFrameTime('high', 40), 'low')
})
