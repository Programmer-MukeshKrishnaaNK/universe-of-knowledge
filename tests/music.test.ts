import assert from 'node:assert/strict'
import { test } from 'node:test'

// A minimal in-memory window.localStorage, so the persisted store can be exercised in Node.
const memory = new Map<string, string>()
;(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  },
}

const { MusicEngine, TRACKS } = await import('../src/audio/engine')
const { useMusic } = await import('../src/store/music')

test('three distinct tracks, each playable by composition', () => {
  assert.deepEqual(
    TRACKS.map((t) => t.id),
    ['origin', 'deep-space', 'frontier'],
  )
  for (const t of TRACKS) {
    assert.equal(typeof t.compose, 'function')
    assert.ok(t.trim > 0 && t.trim < 4)
  }
})

test('no audio before a gesture: a chosen track waits, Off stays idle', () => {
  const e = new MusicEngine()
  e.setChoice('frontier')
  assert.equal(e.state, 'waiting')
  assert.equal(e.unlocked, false)
  e.setChoice('off')
  assert.equal(e.state, 'idle')
})

test('preferences persist and volume is clamped', () => {
  const s = useMusic.getState()
  s.setChoice('deep-space')
  s.setVolume(1.7)
  s.setMuted(true)
  s.setEngine('playing')
  const saved = JSON.parse(memory.get('uok.music.v1') ?? '{}')
  assert.deepEqual(saved.state, { choice: 'deep-space', volume: 1, muted: true })
  // Live engine state is never persisted.
  assert.equal('engine' in saved.state, false)
  s.setVolume(-3)
  assert.equal(useMusic.getState().volume, 0)
})
