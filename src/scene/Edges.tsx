import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, DynamicDrawUsage, LineSegments, ShaderMaterial } from 'three'
import { EDGE_SEGMENTS } from '../engine/world'
import { world } from '../engine/director'
import { prefersReducedMotion } from '../lib/motion'
import { edgeFragment, edgeVertex } from './shaders'

/** All relationships as curved line strips in a single draw call. */
export function Edges() {
  const { lines, material, attrs, travel } = useMemo(() => {
    const w = world!
    const vpe = EDGE_SEGMENTS + 1
    const geo = new BufferGeometry()
    const pos = new BufferAttribute(w.edgeVerts, 3).setUsage(DynamicDrawUsage)
    const emph = new BufferAttribute(w.edgeVertEmph, 1).setUsage(DynamicDrawUsage)
    const flow = new BufferAttribute(w.edgeVertFlow, 1).setUsage(DynamicDrawUsage)
    const len = new BufferAttribute(w.edgeVertLen, 1).setUsage(DynamicDrawUsage)
    const grow = new BufferAttribute(w.edgeVertGrow, 1).setUsage(DynamicDrawUsage)
    geo.setAttribute('aGrow', grow)
    const travel = new BufferAttribute(w.edgeVertTravel, 1).setUsage(DynamicDrawUsage)
    geo.setAttribute('aTravel', travel)
    geo.setAttribute('position', pos)
    geo.setAttribute('aEmph', emph)
    geo.setAttribute('aFlow', flow)
    geo.setAttribute('aLen', len)
    geo.setAttribute('aT', new BufferAttribute(w.edgeVertT, 1))
    geo.setAttribute('aKind', new BufferAttribute(w.edgeVertKind, 1))
    geo.setAttribute('aColor', new BufferAttribute(w.edgeVertColor, 3))
    const index = new Uint32Array(w.m * EDGE_SEGMENTS * 2)
    let k = 0
    for (let e = 0; e < w.m; e++) {
      for (let s = 0; s < EDGE_SEGMENTS; s++) {
        index[k++] = e * vpe + s
        index[k++] = e * vpe + s + 1
      }
    }
    geo.setIndex(new BufferAttribute(index, 1))
    const material = new ShaderMaterial({
      vertexShader: edgeVertex,
      fragmentShader: edgeFragment,
      uniforms: { uTime: { value: 0 }, uReveal: { value: 0 }, uMotion: { value: 1 }, uMap: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const lines = new LineSegments(geo, material)
    lines.frustumCulled = false
    lines.renderOrder = 2
    return { lines, material, attrs: [pos, emph, flow, len, grow], travel }
  }, [])

  useFrame((state) => {
    const w = world!
    material.uniforms.uTime.value = state.clock.elapsedTime
    material.uniforms.uReveal.value = Math.min(1, w.reveal * 1.15)
    material.uniforms.uMotion.value = prefersReducedMotion() ? 0 : 1
    material.uniforms.uMap.value = w.mapLayer
    if (w.travelDirty) {
      travel.needsUpdate = true
      w.travelDirty = false
    }
    if (w.changed.pos || w.changed.emph || w.edgeDirty) {
      w.writeEdgeGeometry()
      for (const a of attrs) a.needsUpdate = true
    }
  })

  return <primitive object={lines} />
}
