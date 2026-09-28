import { useExplore } from '../store/explore'
import { useMusic } from '../store/music'
import { MusicEngine } from './engine'

let engine: MusicEngine | null = null

/**
 * Connects the soundtrack to the app:
 *  - the AudioContext is only created after the visitor's first meaningful
 *    interaction (browser autoplay policy) — never before;
 *  - preferences flow one way, from the listener to the engine;
 *  - the universe may add a subtle lift while travelling, but it never
 *    chooses or changes the track.
 */
export function initMusic() {
  if (engine || typeof window === 'undefined') return
  engine = new MusicEngine()
  const e = engine
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__uokMusic = { engine: e, store: useMusic }
  e.onState = (s) => useMusic.getState().setEngine(s)
  const m = useMusic.getState()
  e.setVolume(m.volume)
  e.setMuted(m.muted)
  e.setChoice(m.choice)

  useMusic.subscribe((s, prev) => {
    if (s.choice !== prev.choice) {
      e.setChoice(s.choice)
      // Choosing a track is itself a gesture — unlock immediately.
      if (s.choice !== 'off') void e.unlock()
    }
    if (s.volume !== prev.volume) e.setVolume(s.volume)
    if (s.muted !== prev.muted) e.setMuted(s.muted)
  })

  const unlockOnce = () => {
    if (useMusic.getState().choice === 'off') return
    void e.unlock().then(() => {
      if (e.unlocked) for (const type of GESTURES) window.removeEventListener(type, unlockOnce, true)
    })
  }
  for (const type of GESTURES) window.addEventListener(type, unlockOnce, true)

  // A subtle lift while journeying — never a track change.
  useExplore.subscribe((s, prev) => {
    if (s.travelling !== prev.travelling) e.setEnergy(s.travelling ? 1 : 0)
  })
}

const GESTURES = ['pointerdown', 'keydown', 'touchend'] as const

/** For QA only. */
export const musicEngine = () => engine
