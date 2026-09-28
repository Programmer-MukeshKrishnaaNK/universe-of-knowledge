import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { EngineState, MusicChoice } from '../audio/engine'
import { safeStorage } from './safeStorage'

interface MusicStore {
  choice: MusicChoice
  volume: number
  muted: boolean
  /** Live engine state (not persisted). */
  engine: EngineState
  setChoice: (c: MusicChoice) => void
  setVolume: (v: number) => void
  setMuted: (m: boolean) => void
  setEngine: (s: EngineState) => void
}

/** The listener's soundtrack preferences. Their choice is always authoritative. */
export const useMusic = create<MusicStore>()(
  persist(
    (set) => ({
      choice: 'origin',
      volume: 0.55,
      muted: false,
      engine: 'idle',
      setChoice: (choice) => set({ choice }),
      setVolume: (volume) => set({ volume: Math.min(1, Math.max(0, volume)) }),
      setMuted: (muted) => set({ muted }),
      setEngine: (engine) => set({ engine }),
    }),
    {
      name: 'uok.music.v1',
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ choice: s.choice, volume: s.volume, muted: s.muted }),
    },
  ),
)
