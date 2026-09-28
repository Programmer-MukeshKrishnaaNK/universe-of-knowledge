import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { AdditiveBlending, Color, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, PlaneGeometry, ShaderMaterial } from 'three'
import { domainColor } from '../data'
import { graph, getLayout } from '../graph'
import { isCompact, world } from '../engine/director'
import { gaussian, mulberry32 } from '../lib/random'
import { nebulaFragment, nebulaVertex } from './shaders'

/**
 * Atmosphere in three depths: veils inside each domain (midground), a few
 * wide washes between them, and distant unexplored clusters (background).
 */
function build(compact: boolean, density: number) {
  const rand = mulberry32(21)
  const layout = getLayout()
  const P = layout.positions
  const pos: number[] = []
  const col: number[] = []
  const size: number[] = []
  const seed: number[] = []
  const alpha: number[] = []
  const c = new Color()
  const push = (x: number, y: number, z: number, color: Color, s: number, a: number) => {
    pos.push(x, y, z)
    col.push(color.r, color.g, color.b)
    size.push(s)
    seed.push(rand())
    alpha.push(a)
  }

  for (const d of graph.topics.filter((t) => t.level === 0)) {
    const i = graph.idx(d.id)
    const r = layout.domainRadius.get(d.domain) ?? 20
    c.set(domainColor[d.domain]).convertSRGBToLinear()
    const veils = Math.max(1, Math.round((compact ? 3 : 5) * density))
    for (let k = 0; k < veils; k++) {
      push(P[i * 3] + gaussian(rand) * r * 0.45, P[i * 3 + 1] + gaussian(rand) * r * 0.2, P[i * 3 + 2] + gaussian(rand) * r * 0.45, c, r * (0.75 + rand() * 0.8), (d.mapped === false ? 0.012 : 0.02) * (0.7 + rand() * 0.6))
    }
  }

  // Distant clusters: knowledge not yet charted, far beyond the map.
  const far = Math.round((compact ? 16 : 30) * density)
  const tints = ['#8fa2ff', '#c7a6ff', '#ffc9a6', '#9fe3d0', '#e3a6c9']
  for (let k = 0; k < far; k++) {
    const u = rand() * 2 - 1
    const a = rand() * Math.PI * 2
    const s = Math.sqrt(1 - u * u)
    const R = 1100 + rand() * 1500
    c.set(tints[k % tints.length]).convertSRGBToLinear()
    push(Math.cos(a) * s * R + layout.center[0], u * R * 0.45 + layout.center[1], Math.sin(a) * s * R + layout.center[2], c, 50 + rand() * 110, 0.035 + rand() * 0.035)
  }

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
  return geo
}

export function Nebulae({ density, version }: { density: number; version: number }) {
  const { mesh, material } = useMemo(() => {
    const material = new ShaderMaterial({
      vertexShader: nebulaVertex,
      fragmentShader: nebulaFragment,
      uniforms: { uReveal: { value: 0 }, uDim: { value: 0 }, uGain: { value: 1 } },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    })
    const mesh = new Mesh(build(isCompact(), density), material)
    mesh.frustumCulled = false
    mesh.renderOrder = -5
    return { mesh, material }
    // Rebuilt as regions arrive (version) or when the quality density changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [density, version])
  useEffect(
    () => () => {
      mesh.geometry.dispose()
      material.dispose()
    },
    [mesh, material],
  )
  useFrame(() => {
    const w = world!
    material.uniforms.uReveal.value = Math.min(1, w.reveal * 1.2)
    material.uniforms.uDim.value = w.dim
  })
  return <primitive object={mesh} />
}
