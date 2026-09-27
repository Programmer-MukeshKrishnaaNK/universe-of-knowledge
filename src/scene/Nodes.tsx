import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
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
import { nodeFragment, nodeVertex } from './shaders'

/** Every knowledge node in one instanced draw call. */
export function Nodes() {
  const size = useThree((s) => s.size)
  const { mesh, material, dyn, known } = useMemo(() => {
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
    geo.setAttribute('iColor', new InstancedBufferAttribute(w.color, 3))
    geo.setAttribute('iSize', new InstancedBufferAttribute(w.size, 1))
    geo.setAttribute('iLevel', new InstancedBufferAttribute(w.level, 1))
    geo.setAttribute('iDelay', new InstancedBufferAttribute(w.delay, 1))
    geo.instanceCount = w.n

    const material = new ShaderMaterial({
      vertexShader: nodeVertex,
      fragmentShader: nodeFragment,
      uniforms: {
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uViewH: { value: 900 },
        uMap: { value: 0 },
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
    return { mesh, material, dyn, known }
  }, [])

  useFrame((state) => {
    const w = world!
    const u = material.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uReveal.value = w.reveal
    u.uViewH.value = size.height
    u.uMap.value = w.mapLayer
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
