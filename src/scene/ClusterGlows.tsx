import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AdditiveBlending, Color, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, PlaneGeometry, ShaderMaterial } from 'three'
import { domainColor } from '../data'
import { graph, universe } from '../graph'
import { rig, world } from '../engine/director'
import { clamp } from '../lib/motion'
import { nebulaFragment, nebulaVertex } from './shaders'

/**
 * Low mode's compressed view: each field (cluster) of knowledge is drawn as a
 * soft glow sized by how much it contains — "there is a whole region here".
 * The glows fade in exactly as the individual concepts fold away with
 * distance, and give way to them as the camera approaches.
 */
export function ClusterGlows({ version }: { version: number }) {
  const { mesh, material } = useMemo(() => {
    const pos: number[] = []
    const col: number[] = []
    const size: number[] = []
    const seed: number[] = []
    const alpha: number[] = []
    const c = new Color()
    const P = universe.positions
    const count = (i: number): number => graph.childIdx[i].reduce((n, k) => n + 1 + count(k), 0)
    graph.topics.forEach((t, i) => {
      if (t.level !== 1) return
      const members = count(i)
      c.set(domainColor[t.domain] ?? '#cccccc').convertSRGBToLinear()
      pos.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2])
      col.push(c.r, c.g, c.b)
      size.push(5 + Math.cbrt(members + 1) * 3.6)
      seed.push(((i * 0.618) % 1) + 0.1)
      // Quiet: a hint of mass, not a coloured fog.
      alpha.push(Math.min(0.2, 0.05 + Math.log2(members + 2) * 0.018))
    })
    const quad = new PlaneGeometry(2, 2)
    const geo = new InstancedBufferGeometry()
    geo.index = quad.index
    geo.setAttribute('position', quad.getAttribute('position'))
    geo.setAttribute('uv', quad.getAttribute('uv'))
    geo.setAttribute('iPos', new InstancedBufferAttribute(new Float32Array(pos), 3))
    geo.setAttribute('iColor', new InstancedBufferAttribute(new Float32Array(col), 3))
    geo.setAttribute('iSize', new InstancedBufferAttribute(new Float32Array(size), 1))
    geo.setAttribute('iSeed', new InstancedBufferAttribute(new Float32Array(seed), 1))
    geo.setAttribute('iAlpha', new InstancedBufferAttribute(new Float32Array(alpha), 1))
    geo.instanceCount = size.length
    const material = new ShaderMaterial({
      vertexShader: nebulaVertex,
      fragmentShader: nebulaFragment,
      uniforms: { uReveal: { value: 0 }, uDim: { value: 0 }, uGain: { value: 0 } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    })
    const mesh = new Mesh(geo, material)
    mesh.frustumCulled = false
    mesh.renderOrder = -4
    return { mesh, material }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version])

  useEffect(
    () => () => {
      mesh.geometry.dispose()
      material.dispose()
    },
    [mesh, material],
  )

  useFrame(({ camera }) => {
    const w = world!
    const d = camera.position.distanceTo(rig.target)
    // Mirrors the node shader's compression range, so glows and concepts hand over smoothly.
    const t = clamp((d - universe.extent * 0.75) / (universe.extent * 0.6), 0, 1)
    material.uniforms.uGain.value = t * t * (3 - 2 * t) * (1 - w.dim * 0.6)
    material.uniforms.uReveal.value = Math.min(1, w.reveal * 1.2)
  })

  return <primitive object={mesh} />
}
