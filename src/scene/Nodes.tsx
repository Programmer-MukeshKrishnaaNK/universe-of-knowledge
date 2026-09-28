import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  CustomBlending,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  OneFactor,
  OneMinusSrcAlphaFactor,
  PlaneGeometry,
  ShaderMaterial,
} from 'three'
import { world } from '../engine/director'
import type { QualityProfile } from '../engine/quality'
import { universe } from '../graph'
import { nodeFragment, nodeVertex } from './shaders'

/** Every knowledge node in one instanced draw call. */
export function Nodes({ profile }: { profile: QualityProfile }) {
  const size = useThree((s) => s.size)
  const lastGeneration = useRef(-1)
  const { mesh, material, dyn, known, statics } = useMemo(() => {
    const w = world!
    const quad = new PlaneGeometry(1, 1)
    const geo = new InstancedBufferGeometry()
    geo.index = quad.index
    geo.setAttribute('position', quad.getAttribute('position'))
    geo.setAttribute('uv', quad.getAttribute('uv'))
    const dynamic = (arr: Float32Array, size: number) => new InstancedBufferAttribute(arr, size).setUsage(DynamicDrawUsage)
    const dyn = [
      dynamic(w.pos, 3),
      dynamic(w.emph, 1),
      dynamic(w.hover, 1),
      dynamic(w.focusAmt, 1),
    ] as const
    const known = dynamic(w.known, 1)
    geo.setAttribute('iPos', dyn[0])
    geo.setAttribute('iEmph', dyn[1])
    geo.setAttribute('iHover', dyn[2])
    geo.setAttribute('iFocus', dyn[3])
    geo.setAttribute('iKnown', known)
    // Written once per node — re-uploaded only when a region ignites.
    const statics = [
      new InstancedBufferAttribute(w.color, 3),
      new InstancedBufferAttribute(w.size, 1),
      new InstancedBufferAttribute(w.level, 1),
      dynamic(w.born, 1),
    ]
    geo.setAttribute('iColor', statics[0])
    geo.setAttribute('iSize', statics[1])
    geo.setAttribute('iLevel', statics[2])
    geo.setAttribute('iBorn', statics[3])
    geo.instanceCount = w.count

    const material = new ShaderMaterial({
      vertexShader: nodeVertex,
      fragmentShader: nodeFragment,
      uniforms: {
        uTime: { value: 0 },
        uClock: { value: 0 },
        uViewH: { value: 900 },
        uMap: { value: 0 },
        uDensity: { value: 0 },
        uMinPointPx: { value: 2.6 },
        uCompress: { value: 0 },
        uCompressRange: { value: [200, 320] },
        uFog: { value: [380, 1100] },
      },
      transparent: true,
      depthWrite: false,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
    })
    const mesh = new Mesh(geo, material)
    mesh.frustumCulled = false // positions live in attributes; culling happens per-fragment
    mesh.renderOrder = 3
    return { mesh, material, dyn, known, statics }
  }, [])

  useFrame((state) => {
    const w = world!
    const u = material.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uClock.value = w.clock
    u.uViewH.value = size.height
    u.uMap.value = w.mapLayer
    u.uDensity.value = Math.min(1, Math.max(0, (w.count - 400) / 4000))
    u.uMinPointPx.value = profile.minPointPx
    u.uCompress.value = profile.compress ? 1 : 0
    u.uCompressRange.value = [universe.extent * 0.75, universe.extent * 1.35]
    u.uFog.value = [universe.extent * 2.77, universe.extent * 8.03] // = 380 / 1100 for the curated universe
    if (lastGeneration.current !== w.generation) {
      lastGeneration.current = w.generation
      mesh.geometry.instanceCount = w.count
      for (const a of statics) a.needsUpdate = true
      dyn.forEach((a) => (a.needsUpdate = true))
      known.needsUpdate = true
    }
    if (w.changed.born) statics[3].needsUpdate = true
    if (w.changed.pos) dyn[0].needsUpdate = true
    if (w.changed.emph) {
      dyn[1].needsUpdate = true
      dyn[2].needsUpdate = true
      dyn[3].needsUpdate = true
    }
    if (w.changed.known) known.needsUpdate = true
  })

  return <primitive object={mesh} />
}
