import { layoutRegion, type RegionLayoutInput } from './layout'

/** Lays out large regions off the main thread so streaming never stutters the frame loop. */
self.onmessage = (e: MessageEvent<{ job: number; input: RegionLayoutInput }>) => {
  const result = layoutRegion(e.data.input)
  ;(self as unknown as Worker).postMessage({ job: e.data.job, positions: result.positions, radius: result.radius }, [result.positions.buffer])
}
