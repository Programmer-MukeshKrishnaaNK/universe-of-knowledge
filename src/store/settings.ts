import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { QUALITY, type QualityChoice, type QualityMode, type QualityProfile } from '../engine/quality'
import { safeStorage } from './safeStorage'

interface SettingsStore {
  quality: QualityChoice
  /** What Auto resolves to on this device (not persisted — re-measured each visit). */
  recommended: QualityMode
  /** The user has seen (and answered) the recommendation. */
  acknowledged: boolean
  setQuality: (q: QualityChoice) => void
  setRecommended: (m: QualityMode) => void
  acknowledge: () => void
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      quality: 'auto',
      recommended: 'high',
      acknowledged: false,
      setQuality: (quality) => set({ quality, acknowledged: true }),
      setRecommended: (recommended) => set({ recommended }),
      acknowledge: () => set({ acknowledged: true }),
    }),
    {
      name: 'uok.settings.v1',
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ quality: s.quality, acknowledged: s.acknowledged }),
    },
  ),
)

export const resolvedMode = (s: { quality: QualityChoice; recommended: QualityMode }): QualityMode => (s.quality === 'auto' ? s.recommended : s.quality)
export const profileOf = (s: { quality: QualityChoice; recommended: QualityMode }): QualityProfile => QUALITY[resolvedMode(s)]
export const currentProfile = () => profileOf(useSettings.getState())
