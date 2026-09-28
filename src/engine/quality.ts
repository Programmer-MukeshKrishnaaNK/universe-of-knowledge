/**
 * Hardware-aware rendering modes. One table drives every budget in the
 * renderer, so a mode is a coherent experience rather than a set of toggles.
 * Values were tuned by measurement (see README → Performance).
 */

export type QualityMode = 'low' | 'medium' | 'high' | 'max'
export type QualityChoice = QualityMode | 'auto'

export interface QualityProfile {
  mode: QualityMode
  label: string
  blurb: string
  /** Device-pixel-ratio ceiling. */
  dpr: number
  msaa: number
  bloom: 'off' | 'half' | 'full'
  /** Maximum relationships drawn at once (selected by relevance, not all). */
  edgeBudget: number
  /** Segments per curved relationship. */
  edgeSegments: number
  /** Pooled label objects. */
  labels: number
  /** Domain formation density (1 = designed density). */
  formations: number
  /** Concept halo particles across the whole universe. */
  halos: number
  strokes: boolean
  nebulae: number
  motes: boolean
  /** Compress distant concepts into their clusters (galaxy → region → cluster). */
  compress: boolean
  /** Smallest on-screen size a distant concept is drawn at (px). */
  minPointPx: number
  /** Hover picking rate (per second). */
  pickHz: number
}

export const QUALITY: Record<QualityMode, QualityProfile> = {
  low: {
    mode: 'low',
    label: 'Low',
    blurb: 'Galaxies and clusters first; concepts appear as you approach. For modest hardware.',
    dpr: 1,
    msaa: 0,
    bloom: 'off',
    edgeBudget: 1200,
    edgeSegments: 10,
    labels: 22,
    formations: 0.35,
    halos: 0,
    strokes: false,
    nebulae: 0.5,
    motes: false,
    compress: true,
    minPointPx: 1.6,
    pickHz: 15,
  },
  medium: {
    mode: 'medium',
    label: 'Medium',
    blurb: 'The universe as it is — domains, clusters, concepts and their relationships.',
    dpr: 1.25,
    msaa: 0,
    bloom: 'half',
    edgeBudget: 3500,
    edgeSegments: 14,
    labels: 38,
    formations: 0.65,
    halos: 2500,
    strokes: true,
    nebulae: 0.8,
    motes: true,
    compress: false,
    minPointPx: 2.2,
    pickHz: 30,
  },
  high: {
    mode: 'high',
    label: 'High',
    blurb: 'Dense and detailed: richer formations, more living connections, full light.',
    dpr: 1.75,
    msaa: 4,
    bloom: 'full',
    edgeBudget: 9000,
    edgeSegments: 20,
    labels: 60,
    formations: 1,
    halos: 7000,
    strokes: true,
    nebulae: 1,
    motes: true,
    compress: false,
    minPointPx: 2.6,
    pickHz: 60,
  },
  max: {
    mode: 'max',
    label: 'Max',
    blurb: 'Everything the engine can show at once. For powerful computers.',
    dpr: 2,
    msaa: 4,
    bloom: 'full',
    edgeBudget: 20000,
    edgeSegments: 16,
    labels: 84,
    formations: 1.35,
    halos: 16000,
    strokes: true,
    nebulae: 1,
    motes: true,
    compress: false,
    minPointPx: 2.8,
    pickHz: 60,
  },
}

export interface DeviceSignals {
  cores: number
  memoryGB: number | null
  compact: boolean
  pixels: number
  software: boolean
  /** Coarse GPU class from the WebGL renderer string, if the browser exposes it. Never stored or sent. */
  gpuClass: 'integrated' | 'apple' | 'discrete' | 'unknown'
  maxTextureSize: number
}

/** Read a few coarse capability signals. Nothing leaves the device. */
export function readSignals(): DeviceSignals {
  const nav = navigator as Navigator & { deviceMemory?: number }
  let renderer = ''
  let maxTextureSize = 4096
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') as WebGL2RenderingContext | null
    if (gl) {
      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  } catch {
    /* no WebGL — the outline fallback handles this */
  }
  const software = /swiftshader|llvmpipe|software|basic render/.test(renderer)
  const gpuClass = /apple|m\d/.test(renderer)
    ? 'apple'
    : /nvidia|geforce|rtx|gtx|radeon rx|radeon pro|amd radeon(?! graphics)/.test(renderer)
      ? 'discrete'
      : /intel|uhd|iris|mali|adreno|powervr|radeon graphics/.test(renderer)
        ? 'integrated'
        : 'unknown'
  return {
    cores: nav.hardwareConcurrency || 4,
    memoryGB: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
    compact: window.innerWidth < 900 || matchMedia('(pointer: coarse)').matches,
    pixels: window.innerWidth * window.innerHeight * Math.min(2, window.devicePixelRatio || 1),
    software,
    gpuClass,
    maxTextureSize,
  }
}

/**
 * Recommend a mode from coarse signals. Max is never recommended — it is a
 * deliberate choice. A measured frame-time probe can refine the result
 * (see refineWithFrameTime).
 */
export function recommend(s: DeviceSignals): QualityMode {
  if (s.software) return 'low'
  if (s.compact) return (s.memoryGB ?? 4) >= 6 && s.cores >= 6 ? 'medium' : 'low'
  if ((s.memoryGB !== null && s.memoryGB <= 4) || s.cores <= 4) return 'medium'
  if (s.gpuClass === 'discrete' || s.gpuClass === 'apple') return 'high'
  if (s.gpuClass === 'integrated') return s.pixels > 4_000_000 ? 'medium' : 'high'
  return 'medium'
}

/** Step the recommendation down when the device measurably struggles. */
export function refineWithFrameTime(mode: QualityMode, medianMs: number): QualityMode {
  const order: QualityMode[] = ['low', 'medium', 'high', 'max']
  let i = order.indexOf(mode)
  if (medianMs > 30) i -= 2
  else if (medianMs > 21) i -= 1
  return order[Math.max(0, i)]
}
