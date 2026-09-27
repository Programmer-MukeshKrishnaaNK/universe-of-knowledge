import { create } from 'zustand'

export type Depth = 'simple' | 'detailed' | 'technical'
export type Phase = 'loading' | 'intro' | 'explore'
export type Via = 'click' | 'search' | 'link' | 'back' | 'keyboard' | 'home'

interface ExploreStore {
  phase: Phase
  loadingStep: string
  focusId: string | null
  /** Bumped on every travel request so re-focusing the same topic still animates. */
  travelNonce: number
  via: Via
  hoverId: string | null
  previewId: string | null
  /** The journey so far — the breadcrumb trail. */
  trail: string[]
  depth: Depth
  showMap: boolean
  travelling: boolean
  announce: string
  searchOpen: boolean
  /** Arrival shows a glance; reading is the user's choice (kept while following links in the text). */
  reading: boolean
  /** A search journey in progress: the regions it passes through, and how many are behind us. */
  route: { ids: string[]; reached: number } | null

  setPhase: (p: Phase, step?: string) => void
  travelTo: (id: string, via?: Via) => void
  back: () => void
  home: () => void
  setHover: (id: string | null) => void
  setPreview: (id: string | null) => void
  setDepth: (d: Depth) => void
  toggleMap: () => void
  setTravelling: (t: boolean) => void
  say: (msg: string) => void
  setSearchOpen: (o: boolean) => void
  setReading: (r: boolean) => void
}

export const useExplore = create<ExploreStore>()((set, get) => ({
  phase: 'loading',
  loadingStep: 'Mapping knowledge…',
  focusId: null,
  travelNonce: 0,
  via: 'home',
  hoverId: null,
  previewId: null,
  trail: [],
  depth: 'simple',
  showMap: false,
  travelling: false,
  announce: '',
  searchOpen: false,
  reading: false,
  route: null,

  setPhase: (phase, step) => set({ phase, loadingStep: step ?? get().loadingStep }),
  travelTo: (id, via = 'click') => {
    const { focusId, trail, travelNonce } = get()
    const nextTrail = via === 'back' ? trail : focusId && focusId !== id ? [...trail.filter((t) => t !== id), focusId].slice(-24) : trail
    set({ focusId: id, trail: nextTrail, via, travelNonce: travelNonce + 1, previewId: null, hoverId: null, reading: via === 'link' ? get().reading : false })
  },
  back: () => {
    const { trail, travelNonce } = get()
    if (!trail.length) {
      if (get().focusId) get().home()
      return
    }
    const prev = trail[trail.length - 1]
    set({ focusId: prev, trail: trail.slice(0, -1), via: 'back', travelNonce: travelNonce + 1, previewId: null })
  },
  home: () => set({ focusId: null, trail: [], via: 'home', travelNonce: get().travelNonce + 1, previewId: null }),
  setHover: (hoverId) => get().hoverId !== hoverId && set({ hoverId }),
  setPreview: (previewId) => set({ previewId }),
  setDepth: (depth) => set({ depth }),
  toggleMap: () => set({ showMap: !get().showMap }),
  setTravelling: (travelling) => set({ travelling }),
  say: (announce) => set({ announce }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setReading: (reading) => set({ reading }),
}))
