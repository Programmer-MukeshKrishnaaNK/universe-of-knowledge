import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial } from 'three'
import { domainColor } from '../data'
import { graph, getLayout } from '../graph'
import { isCompact, world } from '../engine/director'
import { gaussian, mulberry32 } from '../lib/random'
import { prefersReducedMotion } from '../lib/motion'
import { dustFragment, dustVertex } from './shaders'

/**
 * Knowledge dust: faint motes clustered around every region, plus thin
 * filaments along the bridges between domains. It stands for everything not
 * yet charted — the universe is far larger than its mapped nodes.
 */
function buildDust(scale: number) {
  const rand = mulberry32(42)
  const layout = getLayout()
  const P = layout.positions
  const pos: number[] = []
  const col: number[] = []
  const size: number[] = []
  const seed: number[] = []
  const c = new Color()
  const white = new Color(1, 1, 1)
  const push = (x: number, y: number, z: number, color: Color, s: number, brightness: number) => {
    pos.push(x, y, z)
    c.copy(color).lerp(white, 0.25).multiplyScalar(brightness)
    col.push(c.r, c.g, c.b)
    size.push(s)
    seed.push(rand())
  }

  for (const d of graph.topics.filter((t) => t.level === 0)) {
    const di = graph.idx(d.id)
    const dc = new Color(domainColor[d.domain]).convertSRGBToLinear()
    const members = graph.topics.map((t, i) => (t.domain === d.domain ? i : -1)).filter((i) => i >= 0)
    const r = layout.domainRadius.get(d.domain) ?? 20
    const mapped = d.mapped !== false
    const count = Math.round((mapped ? 1250 : 700) * scale)
    // A random tilt per domain so the galaxies don't all lie flat.
    const tilt = (rand() - 0.5) * 0.9
    for (let k = 0; k < count; k++) {
      if (k < count * 0.55) {
        const m = members[Math.floor(rand() * members.length)]
        const spread = graph.topics[m].level === 0 ? 7 : 4.2
        push(P[m * 3] + gaussian(rand) * spread, P[m * 3 + 1] + gaussian(rand) * spread * 0.7, P[m * 3 + 2] + gaussian(rand) * spread, dc, 1.2 + rand() * 1.9, 0.5 + rand() * 0.5)
      } else {
        const a = rand() * Math.PI * 2
        const rr = Math.abs(gaussian(rand)) * r * 0.75 + r * 0.1
        const x = Math.cos(a) * rr, z = Math.sin(a) * rr
        const y = gaussian(rand) * r * 0.1 + x * tilt * 0.3
        push(P[di * 3] + x, P[di * 3 + 1] + y, P[di * 3 + 2] + z, dc, 1 + rand() * 1.6, 0.35 + rand() * 0.45)
      }
    }
  }

  // Filaments along cross-domain bridges.
  const pairs = new Map<string, number>()
  for (let e = 0; e < graph.edgeSource.length; e++) {
    const a = graph.topics[graph.edgeSource[e]].domain
    const b = graph.topics[graph.edgeTarget[e]].domain
    if (a === b) continue
    const key = a < b ? `${a}|${b}` : `${b}|${a}`
    pairs.set(key, (pairs.get(key) ?? 0) + 1)
  }
  for (const [key, weight] of pairs) {
    const [a, b] = key.split('|')
    const ia = graph.idx(a), ib = graph.idx(b)
    const ca = new Color(domainColor[a as keyof typeof domainColor]).convertSRGBToLinear()
    const cb = new Color(domainColor[b as keyof typeof domainColor]).convertSRGBToLinear()
    const count = Math.round(Math.min(420, 90 + weight * 22) * scale)
    const ax = P[ia * 3], ay = P[ia * 3 + 1], az = P[ia * 3 + 2]
    const bx = P[ib * 3], by = P[ib * 3 + 1], bz = P[ib * 3 + 2]
    const mx = (ax + bx) / 2, my = (ay + by) / 2 + 14, mz = (az + bz) / 2
    const mix = new Color()
    for (let k = 0; k < count; k++) {
      const t = rand()
      const u = 1 - t
      const x = u * u * ax + 2 * u * t * mx + t * t * bx
      const y = u * u * ay + 2 * u * t * my + t * t * by
      const z = u * u * az + 2 * u * t * mz + t * t * bz
      const spread = 2.2 + Math.sin(t * Math.PI) * 5
      mix.copy(ca).lerp(cb, t)
      push(x + gaussian(rand) * spread, y + gaussian(rand) * spread * 0.6, z + gaussian(rand) * spread, mix, 0.9 + rand() * 1.3, 0.25 + rand() * 0.35)
    }
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  geo.setAttribute('aColor', new BufferAttribute(new Float32Array(col), 3))
  geo.setAttribute('aSize', new BufferAttribute(new Float32Array(size), 1))
  geo.setAttribute('aSeed', new BufferAttribute(new Float32Array(seed), 1))
  return geo
}

function buildStars(count: number) {
  const rand = mulberry32(3)
  const pos = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  const size = new Float32Array(count)
  const seed = new Float32Array(count)
  const tints = [new Color('#cfd8ff'), new Color('#ffffff'), new Color('#ffe2c4'), new Color('#bfc9ff')]
  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1
    const a = rand() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    // Denser towards the galactic band.
    const y = u * (rand() < 0.55 ? 0.35 : 1)
    const r = 2200 + rand() * 1600
    pos.set([Math.cos(a) * s * r, y * r, Math.sin(a) * s * r], i * 3)
    const c = tints[Math.floor(rand() * tints.length)].clone().convertSRGBToLinear().multiplyScalar(0.25 + Math.pow(rand(), 4) * 1.2)
    col.set([c.r, c.g, c.b], i * 3)
    size[i] = 0.8 + Math.pow(rand(), 5) * 2.4
    seed[i] = rand()
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(pos, 3))
  geo.setAttribute('aColor', new BufferAttribute(col, 3))
  geo.setAttribute('aSize', new BufferAttribute(size, 1))
  geo.setAttribute('aSeed', new BufferAttribute(seed, 1))
  return geo
}

function makeMaterial(attenuate: number, gain: number) {
  return new ShaderMaterial({
    vertexShader: dustVertex,
    fragmentShader: dustFragment,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uReveal: { value: 0 },
      uAttenuate: { value: attenuate },
      uGain: { value: gain },
      uMotion: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

export function Dust() {
  const dpr = useThree((s) => s.viewport.dpr)
  const { dust, stars } = useMemo(() => {
    const compact = isCompact()
    const dust = new Points(buildDust(compact ? 0.45 : 1), makeMaterial(1, 1))
    const stars = new Points(buildStars(compact ? 1400 : 3200), makeMaterial(0, 1))
    dust.frustumCulled = false
    stars.frustumCulled = false
    dust.renderOrder = 1
    stars.renderOrder = 0
    return { dust, stars }
  }, [])

  useFrame((state) => {
    const w = world!
    const motion = prefersReducedMotion() ? 0 : 1
    for (const p of [dust, stars]) {
      const u = (p.material as ShaderMaterial).uniforms
      u.uTime.value = state.clock.elapsedTime
      u.uPixelRatio.value = dpr
      u.uReveal.value = w.reveal
      u.uMotion.value = motion
    }
    ;(dust.material as ShaderMaterial).uniforms.uGain.value = 1.05 - w.dim * 0.5
    // The star shell rides with the camera so it reads as infinitely far away.
    stars.position.copy(state.camera.position)
  })

  return (
    <>
      <primitive object={stars} />
      <primitive object={dust} />
    </>
  )
}
