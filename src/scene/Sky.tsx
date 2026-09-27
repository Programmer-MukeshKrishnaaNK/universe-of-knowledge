import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { BackSide, Mesh, ShaderMaterial, SphereGeometry } from 'three'
import { world } from '../engine/director'
import { skyFragment, skyVertex } from './shaders'

/** A barely-visible galactic band behind everything. */
export function Sky() {
  const mesh = useMemo(() => {
    const m = new Mesh(
      new SphereGeometry(10, 32, 16),
      new ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        uniforms: { uReveal: { value: 0 } },
        side: BackSide,
        depthWrite: false,
        depthTest: false,
      }),
    )
    m.frustumCulled = false
    m.renderOrder = -10
    return m
  }, [])
  useFrame((state) => {
    mesh.position.copy(state.camera.position)
    ;(mesh.material as ShaderMaterial).uniforms.uReveal.value = Math.min(1, world!.reveal * 1.4)
  })
  return <primitive object={mesh} />
}
