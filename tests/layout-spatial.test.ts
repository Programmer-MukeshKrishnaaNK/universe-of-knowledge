import assert from 'node:assert/strict'
import { test } from 'node:test'
import { allTopics } from '../src/data'
import { layoutRegion, scaledAnchors } from '../src/knowledge/layout'
import { SpatialGrid } from '../src/knowledge/spatial'

test('layout is deterministic', () => {
  const topics = allTopics.filter((t) => t.domain === 'physics').map((t) => ({ id: t.id, parent: t.parent, level: t.level, domain: t.domain }))
  const anchors = scaledAnchors({ physics: topics.length })
  const a = layoutRegion({ topics, anchors })
  const b = layoutRegion({ topics, anchors })
  assert.deepEqual(Array.from(a.positions), Array.from(b.positions))
})

test('curated anchors are unscaled; large domains push galaxies apart', () => {
  assert.deepEqual(scaledAnchors({ mathematics: 31 }).mathematics, [-44, 6, -4])
  const big = scaledAnchors({ mathematics: 10000 }).mathematics
  assert.ok(Math.abs(big[0]) > 44)
})

test('spatial queries match brute force, including wide queries', () => {
  const n = 3000
  const pos = new Float32Array(n * 3)
  for (let i = 0; i < n * 3; i++) pos[i] = Math.sin(i * 12.9898) * 400
  const grid = new SpatialGrid(24)
  grid.insertAll(pos, Array.from({ length: n }, (_, i) => i))
  for (const r of [15, 60, 2000]) {
    const found = new Set<number>()
    grid.query(pos, 10, -20, 30, r, (i) => {
      found.add(i)
    })
    const brute = new Set<number>()
    for (let i = 0; i < n; i++) if (Math.hypot(pos[i * 3] - 10, pos[i * 3 + 1] + 20, pos[i * 3 + 2] - 30) <= r) brute.add(i)
    assert.deepEqual(found, brute, `radius ${r}`)
  }
})
