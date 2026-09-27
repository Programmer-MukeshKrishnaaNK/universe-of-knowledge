import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, LineSegments, Points, ShaderMaterial, Vector3 } from 'three'
import { isCompact, world } from '../engine/director'
import { mulberry32 } from '../lib/random'
import { buildFormations, buildMotes } from './formations'
import { prefersReducedMotion } from '../lib/motion'
import { dustFragment, dustVertex, strokeFragment, strokeVertex } from './shaders'

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
      uWrap: { value: 0 },
      uCamPos: { value: new Vector3() },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

export function Dust() {
  const dpr = useThree((s) => s.viewport.dpr)
  const { dust, stars, motes, strokes } = useMemo(() => {
    const compact = isCompact()
    const formations = buildFormations(compact ? 0.5 : 1)
    const dust = new Points(formations.points, makeMaterial(1, 1))
    const strokes = new LineSegments(
      formations.lines,
      new ShaderMaterial({
        vertexShader: strokeVertex,
        fragmentShader: strokeFragment,
        uniforms: { uTime: { value: 0 }, uMotion: { value: 1 }, uGain: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    strokes.frustumCulled = false
    strokes.renderOrder = 1
    const stars = new Points(buildStars(compact ? 1400 : 3200), makeMaterial(0, 1))
    const motes = new Points(buildMotes(compact ? 110 : 260), makeMaterial(1, 1))
    ;(motes.material as ShaderMaterial).uniforms.uWrap.value = 1
    for (const p of [dust, stars, motes]) p.frustumCulled = false
    stars.renderOrder = 0
    dust.renderOrder = 1
    motes.renderOrder = 6
    return { dust, stars, motes, strokes }
  }, [])

  useFrame((state) => {
    const w = world!
    const motion = prefersReducedMotion() ? 0 : 1
    for (const p of [dust, stars, motes]) {
      const u = (p.material as ShaderMaterial).uniforms
      u.uTime.value = state.clock.elapsedTime
      u.uPixelRatio.value = dpr
      u.uReveal.value = w.reveal
      u.uMotion.value = motion
    }
    // Formations recede when a topic is in focus; they never compete with it.
    ;(dust.material as ShaderMaterial).uniforms.uGain.value = 1.9 - w.dim * 1.05
    ;(motes.material as ShaderMaterial).uniforms.uCamPos.value.copy(state.camera.position)
    const su = (strokes.material as ShaderMaterial).uniforms
    su.uTime.value = state.clock.elapsedTime
    su.uMotion.value = motion
    su.uGain.value = w.reveal * (1 - w.dim * 0.6)
    // The star shell rides with the camera so it reads as infinitely far away.
    stars.position.copy(state.camera.position)
  })

  return (
    <>
      <primitive object={stars} />
      <primitive object={strokes} />
      <primitive object={dust} />
      <primitive object={motes} />
    </>
  )
}
