import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import { graph } from '../graph'
import { beginIntro, reframe, rig, startDirector, viewport, world } from '../engine/director'
import { useExplore } from '../store/explore'
import { hud } from '../ui/hud'

const v = new Vector3()

/**
 * Owns the frame loop order (world → camera → picking) and translates raw
 * pointer / wheel / touch input into camera intent.
 */
export function Driver() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const pointer = useRef({ x: -1, y: -1, inside: false, moved: true })

  const scene = useThree((s) => s.scene)
  useEffect(() => {
    if (import.meta.env.DEV) ((window as unknown as { __uok: Record<string, unknown> }).__uok ?? {}).scene = scene
  }, [scene])

  useEffect(() => {
    rig.attach(camera)
    startDirector()
    // Let the first frames settle (shader compile, font atlas) before the opening shot.
    const t = setTimeout(() => {
      beginIntro()
      useExplore.getState().setPhase('explore')
    }, 420)
    return () => clearTimeout(t)
  }, [camera])

  useEffect(() => {
    viewport.width = size.width
    viewport.height = size.height
    reframe()
  }, [size])

  useEffect(() => {
    const el = gl.domElement
    const pointers = new Map<number, { x: number; y: number }>()
    let down: { x: number; y: number; t: number; button: number; shift: boolean } | null = null
    let travelled = 0
    let pinch = 0

    const ndc = (x: number, y: number) => {
      const r = el.getBoundingClientRect()
      return { x: ((x - r.left) / r.width) * 2 - 1, y: -((y - r.top) / r.height) * 2 + 1 }
    }

    const onDown = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top, inside: true, moved: true }
      el.setPointerCapture(e.pointerId)
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (pointers.size === 1) {
        down = { x: e.clientX, y: e.clientY, t: performance.now(), button: e.button, shift: e.shiftKey }
        travelled = 0
      }
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinch = Math.hypot(a.x - b.x, a.y - b.y)
      }
      rig.dragging = true
    }

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top, inside: true, moved: true }
      const prev = pointers.get(e.pointerId)
      if (!prev) return
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      prev.x = e.clientX
      prev.y = e.clientY
      travelled += Math.abs(dx) + Math.abs(dy)
      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()]
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        if (pinch > 0) {
          const m = ndc((a.x + b.x) / 2, (a.y + b.y) / 2)
          rig.zoom(Math.log(pinch / dist) * 9, m.x, m.y)
        }
        pinch = dist
        rig.pan(dx / 2, dy / 2)
        return
      }
      if (travelled < 4) return
      if (down && (down.button === 2 || down.button === 1 || down.shift)) rig.pan(dx, dy)
      else rig.orbit(dx, dy)
    }

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      if (pointers.size < 2) pinch = 0
      if (pointers.size > 0) return
      rig.dragging = false
      const click = down && travelled < 6 && performance.now() - down.t < 500 && down.button === 0
      down = null
      if (!click) return
      const s = useExplore.getState()
      if (e.pointerType !== 'mouse') {
        // Touch: pick at the tap position (there is no hover).
        pointer.current = { ...pointer.current, moved: true }
        const hit = pick(pointer.current.x, pointer.current.y, 22)
        if (hit >= 0) s.travelTo(graph.topics[hit].id, 'click')
        return
      }
      if (s.hoverId) s.travelTo(s.hoverId, 'click')
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1
      // Trackpad pinch arrives as ctrl+wheel with small deltas.
      const k = e.ctrlKey ? 0.012 : 0.0019
      const m = ndc(e.clientX, e.clientY)
      rig.zoom(e.deltaY * scale * k, m.x, m.y)
    }

    const onLeave = () => {
      pointer.current.inside = false
      useExplore.getState().setHover(null)
    }
    const noMenu = (e: Event) => e.preventDefault()

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('contextmenu', noMenu)
    el.style.touchAction = 'none'
    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('contextmenu', noMenu)
    }
    // pick is stable (module-level refs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl])

  /** Screen-space nearest node — fast, forgiving, and independent of halo size. */
  function pick(px: number, py: number, minRadius = 14): number {
    const w = world
    if (!w) return -1
    const h = viewport.height
    const focal = camera.projectionMatrix.elements[5] * h * 0.5
    const view = camera.matrixWorldInverse.elements
    let best = -1
    let bestScore = Infinity
    for (let i = 0; i < w.n; i++) {
      if (w.emph[i] < 0.08) continue
      w.nodePosition(i, v)
      const depth = -(view[2] * v.x + view[6] * v.y + view[10] * v.z + view[14])
      if (depth <= 0.5) continue
      v.project(camera)
      if (v.z > 1) continue
      const sx = (v.x * 0.5 + 0.5) * viewport.width
      const sy = (-v.y * 0.5 + 0.5) * h
      const coreR = (w.size[i] * 0.84 * focal) / depth
      const radius = Math.max(minRadius, coreR * 1.5)
      const d = Math.hypot(sx - px, sy - py)
      if (d > radius) continue
      const score = d / radius - w.emph[i] * 0.25 - (3 - graph.topics[i].level) * 0.02
      if (score < bestScore) {
        bestScore = score
        best = i
      }
    }
    return best
  }

  useFrame((_, dt) => {
    const w = world
    if (!w) return
    w.update(dt)
    rig.update(dt, viewport)
    camera.updateMatrixWorld()

    // Hover picking runs once per frame, not per pointer event.
    const s = useExplore.getState()
    const pt = pointer.current
    if (pt.inside && !rig.dragging && !rig.busy && s.phase === 'explore') {
      const hit = pick(pt.x, pt.y)
      const id = hit >= 0 ? graph.topics[hit].id : null
      if (id !== s.hoverId) s.setHover(id)
      gl.domElement.style.cursor = id ? 'pointer' : 'grab'
    } else if (s.hoverId && (rig.busy || !pt.inside)) {
      s.setHover(null)
    }

    // Anchor the hover tooltip to its node.
    const tipTarget = s.hoverId ?? s.previewId
    const tip = hud.tip
    if (tip) {
      const i = tipTarget ? graph.idx(tipTarget) : -1
      if (i >= 0 && !rig.busy) {
        w.nodePosition(i, v).project(camera)
        const x = (v.x * 0.5 + 0.5) * viewport.width
        const y = (-v.y * 0.5 + 0.5) * viewport.height
        tip.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
        tip.dataset.visible = v.z < 1 ? 'true' : 'false'
      } else tip.dataset.visible = 'false'
    }
  }, -1)

  return null
}
