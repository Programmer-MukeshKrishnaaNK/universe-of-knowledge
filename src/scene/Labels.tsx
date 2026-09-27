import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, Vector3, type Mesh } from 'three'
import interMedium from '@fontsource/inter/files/inter-latin-500-normal.woff?url'
import { domainColor } from '../data'
import { graph } from '../graph'
import { isCompact, panelInset, viewport, world } from '../engine/director'
import { clamp } from '../lib/motion'

type TroikaText = Mesh & { fillOpacity: number; sync: () => void }

const up = new Vector3()
const p = new Vector3()
const q = new Vector3()
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Distance bands (far → near) in which each level's labels become legible. */
const BANDS: [number, number][] = [
  [0, 0],
  [150, 95],
  [70, 44],
  [52, 32],
]
const LEVEL_SCALE = [0.74, 0.8, 0.72, 0.68]
/** Average glyph advance of Inter 500, in ems. */
const EM = 0.56

interface Candidate {
  i: number
  target: number
  priority: number
  x: number
  y: number
  w: number
  h: number
  s: number
}

/**
 * SDF text labels, one per node. Each frame they are billboarded, kept at a
 * near-constant screen size, faded by level-of-detail and emphasis, and
 * de-cluttered in screen space: when two labels would overlap, the more
 * meaningful one wins and the other gracefully fades.
 */
export function Labels() {
  const refs = useRef<(TroikaText | null)[]>([])
  const opacity = useRef(new Float32Array(graph.size))
  const candidates = useRef<Candidate[]>([])

  const items = useMemo(
    () =>
      graph.topics.map((t) => {
        const tint = new Color(domainColor[t.domain]).lerp(new Color('#ffffff'), t.level === 0 ? 0.55 : 0.72)
        const text = t.level === 0 ? t.title.toUpperCase() : t.title
        return {
          text,
          color: '#' + tint.getHexString(),
          spacing: t.level === 0 ? 0.26 : 0.01,
          ems: text.length * (EM + (t.level === 0 ? 0.26 : 0.01)),
        }
      }),
    [],
  )

  useFrame(({ camera }, dt) => {
    const w = world!
    up.setFromMatrixColumn(camera.matrixWorld, 1)
    const compact = isCompact()
    const hasFocus = w.focus >= 0
    const focusNeighbors = hasFocus ? new Set(graph.neighbors(w.focus)) : null
    const focal = camera.projectionMatrix.elements[5] * viewport.height * 0.5
    const list = candidates.current
    list.length = 0

    for (let i = 0; i < graph.size; i++) {
      const t = graph.topics[i]
      w.nodePosition(i, p)
      const d = camera.position.distanceTo(p)
      const e = w.emph[i]
      const lvl = t.level
      let priority = 10 + (3 - lvl) * 4 + e * 10

      let target: number
      if (lvl === 0) {
        target = smooth(14, 40, d) * (hasFocus ? (i === w.focus ? 0.8 : focusNeighbors?.has(i) ? 0.4 : 0.16) : 0.78) * (t.mapped === false ? 0.62 : 1)
        priority += hasFocus ? 0 : 30
      } else {
        const [far, near] = BANDS[lvl]
        const k = compact ? 0.8 : 1
        target = smooth(far * k, near * k, d) * smooth(hasFocus ? 0.4 : 0.2, hasFocus ? 0.9 : 0.62, e)
      }
      if (focusNeighbors?.has(i) && lvl > 0) {
        target = Math.max(target, 0.88 * smooth(210, 120, d))
        priority += 40
      }
      if (i === w.focus) {
        target = lvl === 0 ? target : 1
        priority += 80
      }
      if (w.hover[i] > 0.01) {
        target = Math.max(target, w.hover[i])
        priority += 100
      }
      target *= clamp(w.reveal * 1.6 - w.delay[i], 0, 1)
      if (target < 0.02 && opacity.current[i] < 0.012) {
        const label = refs.current[i]
        if (label) label.visible = false
        continue
      }

      // Screen-space footprint for de-cluttering.
      const s = clamp(d * 0.0215, 0.2, 9) * LEVEL_SCALE[lvl] * (1 + w.hover[i] * 0.08 + w.focusAmt[i] * 0.12) * (compact ? 1.12 : 1)
      q.copy(p).project(camera)
      const depth = Math.max(0.1, d)
      const fontPx = (s * focal) / depth
      const nodePx = (w.visualSize(i) * (lvl === 0 ? 0.95 : 0.78) * focal) / depth
      list.push({
        i,
        target: q.z > 1 ? 0 : target,
        priority,
        x: (q.x * 0.5 + 0.5) * viewport.width,
        y: (-q.y * 0.5 + 0.5) * viewport.height + nodePx + fontPx * 0.55,
        w: items[i].ems * fontPx,
        h: fontPx * 1.15,
        s,
      })
    }

    // Greedy placement by priority. The interface chrome is pre-placed so
    // labels never slide underneath the top bar or the reading panel.
    list.sort((a, b) => b.priority - a.priority)
    const W = viewport.width
    const H = viewport.height
    const zone = (x: number, y: number, w: number, h: number, owner = -1): Candidate => ({ i: owner, target: 1, priority: 0, x: x + w / 2, y, w, h, s: 0 })
    const placed: Candidate[] = [zone(0, 0, W, 50)]
    // Bright cores (domains, the focus) are obstacles too — no label under a sun.
    for (let i = 0; i < graph.size; i++) {
      if ((graph.topics[i].level !== 0 || w.emph[i] < 0.4) && i !== w.focus) continue
      w.nodePosition(i, q)
      const depth = q.distanceTo(camera.position)
      q.project(camera)
      if (q.z > 1) continue
      const rad = (w.visualSize(i) * 1.1 * focal) / Math.max(depth, 0.1)
      placed.push(zone((q.x * 0.5 + 0.5) * W - rad, (-q.y * 0.5 + 0.5) * H - rad, rad * 2, rad * 2, i))
    }
    if (hasFocus) {
      const inset = panelInset()
      if (inset.x) placed.push(zone(W - inset.x, 0, inset.x, H))
      if (inset.y) placed.push(zone(0, H - inset.y, W, inset.y))
    }
    for (const c of list) {
      if (c.target > 0.05) {
        const pad = 6
        const hit = placed.some((o) => o.i !== c.i && Math.abs(o.x - c.x) * 2 < o.w + c.w + pad && Math.abs(o.y + o.h / 2 - (c.y + c.h / 2)) * 2 < o.h + c.h + pad * 0.5)
        if (hit && c.priority < 180) c.target = 0
        else placed.push(c)
      }

      const label = refs.current[c.i]
      if (!label) continue
      const o = (opacity.current[c.i] += (c.target - opacity.current[c.i]) * (1 - Math.exp(-dt * 8)))
      label.visible = o > 0.012
      if (!label.visible) continue
      label.fillOpacity = o
      label.scale.setScalar(c.s)
      w.nodePosition(c.i, p)
      const offset = w.visualSize(c.i) * (graph.topics[c.i].level === 0 ? 0.95 : 0.78) + c.s * 0.55
      label.position.copy(p).addScaledVector(up, -offset)
      label.quaternion.copy(camera.quaternion)
    }
  })

  return (
    <group>
      {items.map((it, i) => (
        <Text
          key={graph.topics[i].id}
          ref={(el: unknown) => {
            refs.current[i] = el as TroikaText | null
          }}
          font={interMedium}
          fontSize={1}
          letterSpacing={it.spacing}
          anchorX="center"
          anchorY="top"
          color={it.color}
          renderOrder={5}
          material-depthWrite={false}
          material-depthTest={false}
          material-toneMapped={false}
          visible={false}
        >
          {it.text}
        </Text>
      ))}
    </group>
  )
}
