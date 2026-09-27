import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { KnowledgeState, UserKnowledge } from '../data/schema'
import { safeStorage } from './safeStorage'

/**
 * The personal knowledge map — "what YOU know" layered over "what humanity
 * knows". Stored locally for now; the shape matches the UserKnowledge schema
 * so it can sync to a backend without changing callers.
 */
interface KnowledgeStore {
  userId: string
  entries: Record<string, UserKnowledge>
  set: (topicId: string, state: KnowledgeState | null) => void
  touch: (topicId: string) => void
  reset: () => void
}

export const useKnowledge = create<KnowledgeStore>()(
  persist(
    (set, get) => ({
      userId: 'local',
      entries: {},
      set: (topicId, state) => {
        const entries = { ...get().entries }
        if (state === null) delete entries[topicId]
        else {
          const now = Date.now()
          entries[topicId] = {
            userId: get().userId,
            topicId,
            state,
            confidence: state === 'understood' ? 0.9 : state === 'learning' ? 0.5 : state === 'review' ? 0.4 : 0.1,
            lastSeen: now,
            updatedAt: now,
          }
        }
        set({ entries })
      },
      touch: (topicId) => {
        const existing = get().entries[topicId]
        const now = Date.now()
        set({
          entries: {
            ...get().entries,
            [topicId]: existing
              ? { ...existing, lastSeen: now }
              : { userId: get().userId, topicId, state: 'discovered', confidence: 0, lastSeen: now, updatedAt: now },
          },
        })
      },
      reset: () => set({ entries: {} }),
    }),
    { name: 'uok.knowledge.v1', storage: createJSONStorage(() => safeStorage) },
  ),
)

export const knowledgeOf = (id: string) => useKnowledge.getState().entries[id]?.state
