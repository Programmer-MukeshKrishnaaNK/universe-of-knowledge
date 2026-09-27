import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { AdditiveBlending, Mesh, PlaneGeometry, ShaderMaterial } from 'three'
import { ripples } from '../engine/ripples'
import { prefersReducedMotion } from '../lib/motion'
import { rippleFragment, rippleVertex } from './shaders'

export function Ripples() {
  const meshes = useMemo(() => {
    const geo = new PlaneGeometry(2, 2)
    return ripples.items.map(() => {
      const m = new Mesh(
        geo,
        new ShaderMaterial({
          vertexShader: rippleVertex,
          fragmentShader: rippleFragment,
          uniforms: { uPos: { value: null }, uScale: { value: 1 }, uProgress: { value: 0 }, uKind: { value: 0 } },
          transparent: true,
          depthWrite: false,
          blending: AdditiveBlending,
        }),
      )
      m.frustumCulled = false
      m.visible = false
      m.renderOrder = 4
      return m
    })
  }, [])

  useFrame((_, dt) => {
    const reduced = prefersReducedMotion()
    ripples.items.forEach((r, i) => {
      const m = meshes[i]
      if (!r.active || reduced) {
        m.visible = false
        r.active = r.active && !reduced
        return
      }
      r.age += dt
      const t = Math.min(1, r.age / r.life)
      if (t >= 1) {
        r.active = false
        m.visible = false
        return
      }
      const u = (m.material as ShaderMaterial).uniforms
      const ease = 1 - Math.pow(1 - t, 3)
      u.uPos.value = r.position
      u.uScale.value = r.size * (0.6 + ease * (r.kind === 0 ? 3.6 : 6.5))
      u.uProgress.value = t
      u.uKind.value = r.kind
      m.visible = true
    })
  })

  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  )
}
