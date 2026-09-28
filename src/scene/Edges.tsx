import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, DataTexture, FloatType, LineSegments, NearestFilter, RGBAFormat, ShaderMaterial, Vector3 } from 'three'
import { universe } from '../graph'
import { EDGE_TEX_WIDTH, EdgeField } from '../engine/edges'
import { rig, world } from '../engine/director'
import { prefersReducedMotion } from '../lib/motion'
import { edgeFragment, edgeVertex } from './shaders'

const NODE_TEX_WIDTH = 1024
const look = new Vector3()
const lastLook = new Vector3(Infinity, 0, 0)

function floatTexture(width: number, height: number) {
  const t = new DataTexture(new Float32Array(width * height * 4), width, height, RGBAFormat, FloatType)
  t.minFilter = t.magFilter = NearestFilter
  t.needsUpdate = true
  return t
}

/**
 * Relationships, drawn from a budget. The geometry is a fixed set of slots
 * (built once per quality mode); which relationship occupies each slot, and
 * how it looks, lives in textures the GPU reads directly. Curves are computed
 * in the vertex shader from node positions, so moving thousands of nodes
 * costs one texture upload, not a geometry rebuild.
 */
export function Edges({ budget, segments }: { budget: number; segments: number }) {
  const w = world!
  const lastSelect = useRef(0)
  const lastPosVersion = useRef(-1)
  const lastGeneration = useRef(-1)

  const field = useMemo(() => new EdgeField(w, budget), [w, budget])
  useEffect(() => {
    w.edges = field
    field.markSelectionDirty()
  }, [w, field])

  const { lines, material, nodePos, nodeColor, edgeTex } = useMemo(() => {
    const vpe = segments + 1
    const pos = new Float32Array(budget * vpe * 3)
    const index = new Uint32Array(budget * segments * 2)
    let k = 0
    for (let s = 0; s < budget; s++) {
      for (let j = 0; j < vpe; j++) {
        const v = s * vpe + j
        pos[v * 3] = s
        pos[v * 3 + 1] = j / segments
      }
      for (let j = 0; j < segments; j++) {
        index[k++] = s * vpe + j
        index[k++] = s * vpe + j + 1
      }
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(pos, 3))
    geo.setIndex(new BufferAttribute(index, 1))
    geo.setDrawRange(0, 0)
    const rows = Math.max(1, Math.ceil(w.capacity / NODE_TEX_WIDTH))
    const nodePos = floatTexture(NODE_TEX_WIDTH, rows)
    const nodeColor = floatTexture(NODE_TEX_WIDTH, rows)
    const edgeTex = new DataTexture(field.data, EDGE_TEX_WIDTH, field.data.length / 4 / EDGE_TEX_WIDTH, RGBAFormat, FloatType)
    edgeTex.minFilter = edgeTex.magFilter = NearestFilter
    edgeTex.needsUpdate = true
    const material = new ShaderMaterial({
      vertexShader: edgeVertex,
      fragmentShader: edgeFragment,
      uniforms: {
        uNodePos: { value: nodePos },
        uNodeColor: { value: nodeColor },
        uEdges: { value: edgeTex },
        uNodeTexW: { value: NODE_TEX_WIDTH },
        uEdgeTexW: { value: EDGE_TEX_WIDTH },
        uCenter: { value: w.center },
        uFog: { value: [400, 1100] },
        uNear: { value: 60 },
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uMotion: { value: 1 },
        uMap: { value: 0 },
        uFocused: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const lines = new LineSegments(geo, material)
    lines.frustumCulled = false
    lines.renderOrder = 2
    return { lines, material, nodePos, nodeColor, edgeTex }
  }, [w, field, budget, segments])

  useEffect(
    () => () => {
      lines.geometry.dispose()
      material.dispose()
      nodePos.dispose()
      nodeColor.dispose()
      edgeTex.dispose()
    },
    [lines, material, nodePos, nodeColor, edgeTex],
  )

  useFrame((state) => {
    const u = material.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uReveal.value = Math.min(1, w.reveal * 1.15)
    u.uMotion.value = prefersReducedMotion() ? 0 : 1
    u.uMap.value = w.mapLayer
    u.uFocused.value = w.focus >= 0 ? 1 : 0
    u.uFog.value = [universe.extent * 2.77, universe.extent * 8.03]
    const camDist = state.camera.position.distanceTo(rig.target)
    u.uNear.value = Math.max(30, camDist * 0.6)

    // Node colours (static per node) whenever new regions ignite.
    if (lastGeneration.current !== w.generation) {
      lastGeneration.current = w.generation
      const d = nodeColor.image.data as Float32Array
      for (let i = 0; i < w.count; i++) {
        d[i * 4] = w.color[i * 3]
        d[i * 4 + 1] = w.color[i * 3 + 1]
        d[i * 4 + 2] = w.color[i * 3 + 2]
        d[i * 4 + 3] = w.level[i]
      }
      nodeColor.needsUpdate = true
      lastPosVersion.current = -1
    }
    // Node positions — only while something moves.
    if (w.changed.pos || lastPosVersion.current < 0) {
      const d = nodePos.image.data as Float32Array
      for (let i = 0; i < w.count; i++) {
        d[i * 4] = w.pos[i * 3]
        d[i * 4 + 1] = w.pos[i * 3 + 1]
        d[i * 4 + 2] = w.pos[i * 3 + 2]
      }
      nodePos.needsUpdate = true
      lastPosVersion.current = 1
    }

    // Re-select what to draw when intent changes, or a few times a second as the camera travels.
    const now = state.clock.elapsedTime
    if (rig.flight) look.copy(rig.flight.look1)
    else look.copy(rig.target)
    const moved = look.distanceTo(lastLook) > Math.max(4, camDist * 0.08)
    if (field.selectionDirty || (moved && now - lastSelect.current > 0.25)) {
      field.select(look, camDist, (x, y, z, r, visit) => universe.spatial.query(universe.positions, x, y, z, r, visit))
      lastSelect.current = now
      lastLook.copy(look)
      lines.geometry.setDrawRange(0, field.count * segments * 2)
      field.requestUpload()
    }
    if (field.uploaded) edgeTex.needsUpdate = true
  })

  return <primitive object={lines} />
}
