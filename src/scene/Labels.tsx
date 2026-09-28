import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Group, Vector3 } from 'three'
import { Text } from 'troika-three-text'
import interMedium from '@fontsource/inter/files/inter-latin-500-normal.woff?url'
import { domainColor } from '../data'
import { graph, universe } from '../graph'
import { isCompact, panelInset, rig, viewport, world } from '../engine/director'
import { clamp } from '../lib/motion'

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
const LEVEL_SCALE = [0.6, 0.8, 0.72, 0.68]
/** Average glyph advance of Inter 500, in ems. */
const EM = 0.56
/** Up to this many concepts, every one is a label candidate; beyond it, candidates come from the spatial index. */
const SCAN_ALL = 1500

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

interface LabelStyle {
  text: string
  color: string
  spacing: number
  ems: number
}

/**
 * A fixed pool of SDF text labels.
 *
 * The universe may hold tens of thousands of concepts, but only a handful of
 * labels can ever be read at once. Each frame the most meaningful candidates
 * (focus, hover, route, domains, what is near and legible) are ranked,
 * de-cluttered in screen space around the interface chrome, and the pool's
 * text objects are handed to the winners. A label keeps its slot while it
 * stays visible, fades out before its slot is reused, and never pops.
 */
export function Labels({ poolSize }: { poolSize: number }) {
  const group = useRef<Group>(null)
  const opacity = useRef(new Float32Array(world!.capacity))
  const owner = useRef(new Int32Array(poolSize).fill(-1))
  const slotOf = useRef(new Map<number, number>())
  const styles = useRef(new Map<number, LabelStyle>())

  const pool = useMemo(
    () =>
      Array.from({ length: poolSize }, () => {
        const t = new Text()
        t.font = interMedium
        t.fontSize = 1
        t.anchorX = 'center'
        t.anchorY = 'top'
        t.renderOrder = 5
        t.material.depthWrite = false
        t.material.depthTest = false
        t.material.toneMapped = false
        t.visible = false
        return t
      }),
    [poolSize],
  )

  useEffect(() => {
    const g = group.current
    if (!g) return
    for (const t of pool) g.add(t)
    return () => {
      for (const t of pool) {
        g.remove(t)
        t.dispose()
      }
      slotOf.current.clear()
      owner.current.fill(-1)
    }
  }, [pool])

  const style = (i: number): LabelStyle => {
    let s = styles.current.get(i)
    if (!s) {
      const t = graph.topics[i]
      const tint = new Color(domainColor[t.domain] ?? '#cccccc').lerp(new Color('#ffffff'), t.level === 0 ? 0.55 : 0.72)
      const text = t.level === 0 ? t.title.toUpperCase() : t.title
      s = { text, color: '#' + tint.getHexString(), spacing: t.level === 0 ? 0.26 : 0.01, ems: text.length * (EM + (t.level === 0 ? 0.26 : 0.01)) }
      styles.current.set(i, s)
    }
    return s
  }

  useFrame(({ camera }, dt) => {
    const w = world!
    up.setFromMatrixColumn(camera.matrixWorld, 1)
    const compact = isCompact()
    const hasFocus = w.focus >= 0
    const focusNeighbors = hasFocus ? new Set(graph.neighbors(w.focus)) : null
    const focal = camera.projectionMatrix.elements[5] * viewport.height * 0.5
    const op = opacity.current
    const spread = Math.max(1, universe.extent / 137) // 137 = the curated universe
    const bandScale = [1, spread, Math.sqrt(spread), 1]

    // ── Who could be labelled? ──
    const cand = new Set<number>()
    if (w.count <= SCAN_ALL) for (let i = 0; i < w.count; i++) cand.add(i)
    else {
      for (const x of [w.focus, w.hoverIdx, w.previewIdx]) if (x >= 0) cand.add(x)
      focusNeighbors?.forEach((i) => cand.add(i))
      for (const d of graph.byDomain.keys()) {
        const di = graph.idx(d)
        if (di >= 0) cand.add(di)
      }
      for (const e of w.routeEdges) {
        cand.add(graph.edgeSource[e])
        cand.add(graph.edgeTarget[e])
      }
      for (const i of slotOf.current.keys()) cand.add(i)
      const look = rig.flight ? rig.flight.look1 : rig.target
      const R = clamp(camera.position.distanceTo(look) * 1.1, 60, 1200)
      let visited = 0
      universe.spatial.query(universe.positions, look.x, look.y, look.z, R, (i) => {
        // Only levels that could be legible at this distance are worth ranking.
        const lv = Math.min(3, w.level[i])
        if (lv <= 1 || camera.position.distanceTo(w.nodePosition(i, p)) < BANDS[lv][0] * bandScale[lv]) cand.add(i)
        return ++visited < 6000
      })
    }

    const list: Candidate[] = []
    for (const i of cand) {
      if (i >= w.count) continue
      const t = graph.topics[i]
      w.nodePosition(i, p)
      const d = camera.position.distanceTo(p)
      const e = w.emph[i]
      const lvl = t.level
      let priority = 10 + (3 - lvl) * 4 + e * 10
      let target: number
      if (lvl === 0) {
        target = smooth(14, 40, d) * (hasFocus ? (i === w.focus ? 0.8 : focusNeighbors?.has(i) ? 0.4 : 0.16) : 0.6) * (t.mapped === false ? 0.62 : 1)
        priority += hasFocus ? 0 : 30
      } else {
        const [far, near] = BANDS[lvl]
        // Larger universes spread fields and clusters further apart; their names carry further too.
        const k = (compact ? 0.8 : 1) * bandScale[lvl]
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
      target *= clamp((w.clock - w.born[i]) / 1.3, 0, 1)
      if (target < 0.02 && op[i] < 0.012) continue
      const s = clamp(d * 0.0215, 0.2, 80) * LEVEL_SCALE[lvl] * (1 + w.hover[i] * 0.08 + w.focusAmt[i] * 0.12) * (compact ? 1.12 : 1)
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
        w: style(i).ems * fontPx,
        h: fontPx * 1.15,
        s,
      })
    }

    // ── Greedy de-cluttering around the interface chrome and bright cores ──
    list.sort((a, b) => b.priority - a.priority)
    const W = viewport.width
    const H = viewport.height
    const zone = (x: number, y: number, zw: number, zh: number, who = -1): Candidate => ({ i: who, target: 1, priority: 0, x: x + zw / 2, y, w: zw, h: zh, s: 0 })
    const placed: Candidate[] = [zone(0, 0, W, 50)]
    const obstacles = new Set<number>(w.focus >= 0 ? [w.focus] : [])
    for (const d of graph.byDomain.keys()) {
      const di = graph.idx(d)
      if (di >= 0 && di < w.count && w.emph[di] >= 0.4) obstacles.add(di)
    }
    for (const i of obstacles) {
      w.nodePosition(i, q)
      const depth = q.distanceTo(camera.position)
      q.project(camera)
      if (q.z > 1) continue
      const rad = (w.visualSize(i) * 1.1 * focal) / Math.max(depth, 0.1)
      placed.push(zone((q.x * 0.5 + 0.5) * W - rad, (-q.y * 0.5 + 0.5) * H - rad, rad * 2, rad * 2, i))
    }
    if (hasFocus) {
      if (!compact) placed.push(zone(0, H / 2 - 85, 150, 170)) // depth meter
      const inset = panelInset()
      if (inset.x) placed.push(zone(W - inset.x, 0, inset.x, H))
      if (inset.y) placed.push(zone(0, H - inset.y, W, inset.y))
    }
    const winners: Candidate[] = []
    for (const c of list) {
      if (c.target > 0.05) {
        const pad = 6
        const hit = placed.some((o) => o.i !== c.i && Math.abs(o.x - c.x) * 2 < o.w + c.w + pad && Math.abs(o.y + o.h / 2 - (c.y + c.h / 2)) * 2 < o.h + c.h + pad * 0.5)
        if (hit && c.priority < 180) c.target = 0
        else placed.push(c)
      }
      if (c.target > 0.05 || op[c.i] > 0.012) winners.push(c)
    }

    // ── Hand pool slots to winners (keeping existing owners in place) ──
    const k = 1 - Math.exp(-dt * 8)
    const ranked = winners.slice(0, poolSize * 2)
    const keep = new Set<number>()
    for (const c of ranked) if (slotOf.current.has(c.i)) keep.add(c.i)
    for (const [i, s] of slotOf.current) {
      if (keep.has(i)) continue
      // Not a candidate any more: fade out, then free the slot.
      op[i] += (0 - op[i]) * k
      if (op[i] < 0.012) {
        slotOf.current.delete(i)
        owner.current[s] = -1
        pool[s].visible = false
      } else pool[s].fillOpacity = op[i]
    }
    for (const c of ranked) {
      let s = slotOf.current.get(c.i)
      if (s === undefined) {
        if (c.target <= 0.05) continue
        s = owner.current.indexOf(-1)
        if (s < 0) continue // pool full: the most meaningful labels already hold every slot
        owner.current[s] = c.i
        slotOf.current.set(c.i, s)
        const st = style(c.i)
        const label = pool[s]
        label.text = st.text
        label.letterSpacing = st.spacing
        label.color = st.color
        label.sync()
        op[c.i] = 0
      }
      const label = pool[s]
      op[c.i] += (c.target - op[c.i]) * k
      label.visible = op[c.i] > 0.012
      if (!label.visible) continue
      label.fillOpacity = op[c.i]
      label.scale.setScalar(c.s)
      w.nodePosition(c.i, p)
      const offset = w.visualSize(c.i) * (graph.topics[c.i].level === 0 ? 0.95 : 0.78) + c.s * 0.55
      label.position.copy(p).addScaledVector(up, -offset)
      label.quaternion.copy(camera.quaternion)
    }
  })

  return <group ref={group} />
}
