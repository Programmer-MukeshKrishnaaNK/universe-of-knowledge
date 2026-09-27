import { BufferAttribute, BufferGeometry, Color, Euler, Matrix4, Vector3 } from 'three'
import { domainColor } from '../data'
import type { DomainId } from '../data/schema'
import { graph, getLayout } from '../graph'
import { gaussian, mulberry32 } from '../lib/random'

/**
 * Domain formations — each region of knowledge has its own structure and
 * behaviour, so regions become recognisable without a legend:
 *
 *   mathematics       crystalline lattice, a coherent wave passing through it
 *   physics           dipole field lines with energy streaming along them
 *   astronomy         a two-armed spiral disk in slow differential rotation
 *   computer science  orthogonal circuit traces carrying fast signals
 *   chemistry         electron shells turning around a few nuclei
 *   biology           a drifting double helix
 *   earth science     stratified shells
 *   neuroscience      branching dendrites with travelling spikes
 *   engineering       a blueprint of rings and spokes
 *
 * Plus concept halos (denser around well-connected ideas) and currents along
 * the bridges between domains. Everything is one Points draw call.
 *
 * Motion modes (decoded in the dust vertex shader):
 *   0  still, soft independent twinkle
 *   1  stream: travels along aTan; aCenter.x = cycles / second
 *   2  orbit: turns around aCenter (y axis); aTan.x = radians / second
 *   3  lattice: still, brightness follows a wave travelling through space
 */

export const MODE = { still: 0, stream: 1, orbit: 2, lattice: 3 } as const

class Builder {
  pos: number[] = []
  col: number[] = []
  size: number[] = []
  seed: number[] = []
  mode: number[] = []
  tan: number[] = []
  center: number[] = []
  // Structural strokes (pairs of vertices).
  lPos: number[] = []
  lCol: number[] = []
  lT: number[] = []
  lKind: number[] = []
  private c = new Color()
  private white = new Color(1, 1, 1)
  constructor(private rand: () => number) {}

  add(p: Vector3, color: Color, size: number, bright: number, mode = 0, tan: Vector3 | null = null, center: Vector3 | null = null, whiten = 0.25) {
    this.pos.push(p.x, p.y, p.z)
    this.c.copy(color).lerp(this.white, whiten).multiplyScalar(bright)
    this.col.push(this.c.r, this.c.g, this.c.b)
    this.size.push(size)
    this.seed.push(this.rand())
    this.mode.push(mode)
    this.tan.push(tan?.x ?? 0, tan?.y ?? 0, tan?.z ?? 0)
    this.center.push(center?.x ?? 0, center?.y ?? 0, center?.z ?? 0)
  }

  /** A faint polyline; `kind` follows MODE (1 = flow pulses, 3 = lattice wave). `alpha` scales colour. */
  polyline(points: Vector3[], color: Color, alpha: number, kind: number) {
    let len = 0
    const acc = [0]
    for (let k = 1; k < points.length; k++) acc.push((len += points[k].distanceTo(points[k - 1])))
    for (let k = 1; k < points.length; k++) {
      for (const j of [k - 1, k]) {
        const p = points[j]
        this.lPos.push(p.x, p.y, p.z)
        this.lCol.push(color.r * alpha, color.g * alpha, color.b * alpha)
        this.lT.push(acc[j])
        this.lKind.push(kind)
      }
    }
  }

  lineGeometry() {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.lPos), 3))
    g.setAttribute('aColor', new BufferAttribute(new Float32Array(this.lCol), 3))
    g.setAttribute('aT', new BufferAttribute(new Float32Array(this.lT), 1))
    g.setAttribute('aKind', new BufferAttribute(new Float32Array(this.lKind), 1))
    return g
  }

  geometry() {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.pos), 3))
    g.setAttribute('aColor', new BufferAttribute(new Float32Array(this.col), 3))
    g.setAttribute('aSize', new BufferAttribute(new Float32Array(this.size), 1))
    g.setAttribute('aSeed', new BufferAttribute(new Float32Array(this.seed), 1))
    g.setAttribute('aMode', new BufferAttribute(new Float32Array(this.mode), 1))
    g.setAttribute('aTan', new BufferAttribute(new Float32Array(this.tan), 3))
    g.setAttribute('aCenter', new BufferAttribute(new Float32Array(this.center), 3))
    return g
  }
}

type Ctx = { b: Builder; rand: () => number; A: Vector3; r: number; color: Color; dim: number; scale: number; rot: Matrix4 }

const v = () => new Vector3()

function lattice({ b, rand, A, r, color, dim, scale, rot }: Ctx) {
  const a = r * 0.17
  const n = Math.ceil((1.25 * r) / a)
  const site = (i: number, j: number, k: number) => new Vector3(i * a, j * a * 0.62, k * a).applyMatrix4(rot)
  for (let i = -n; i <= n; i++)
    for (let j = -3; j <= 3; j++)
      for (let k = -n; k <= n; k++) {
        const p = site(i, j, k)
        const e = (p.x / (1.2 * r)) ** 2 + (p.y / (0.5 * r)) ** 2 + (p.z / (1.2 * r)) ** 2
        if (e > 1 || rand() > (1 - e) * 1.1 * scale + 0.08) continue
        b.add(p.clone().add(A), color, 2.3, 0.75 * dim, MODE.lattice, null, null, 0.4)
        // Crystal bonds: dotted edges to some neighbours.
        for (const [di, dj, dk, prob] of [[1, 0, 0, 0.9], [0, 0, 1, 0.85], [0, 1, 0, 0.45]] as const) {
          if (rand() > prob * scale) continue
          const q = site(i + di, j + dj, k + dk)
          b.polyline([p.clone().add(A), q.clone().add(A)], color, 0.085 * dim, MODE.lattice)
        }
      }
}

function fieldLines({ b, rand, A, r, color, dim, scale, rot }: Ctx) {
  const shells = [0.45, 0.75, 1.1]
  const azimuths = Math.round(9 * Math.sqrt(scale))
  const samples = 90
  for (const L of shells)
    for (let q = 0; q < azimuths; q++) {
      const phi = (q / azimuths) * Math.PI * 2 + L * 1.7 + rand() * 0.2
      const pts: Vector3[] = []
      for (let s = 0; s <= samples; s++) {
        const th = 0.16 * Math.PI + (s / samples) * 0.68 * Math.PI
        const rr = L * r * Math.sin(th) ** 2
        pts.push(new Vector3(rr * Math.sin(th) * Math.cos(phi), rr * Math.cos(th) * 1.15, rr * Math.sin(th) * Math.sin(phi)).applyMatrix4(rot))
      }
      b.polyline(pts.map((x) => x.clone().add(A)), color, 0.1 * dim, MODE.stream)
      for (let s = 1; s < pts.length - 1; s += 3) {
        if (rand() > 0.55 * scale + 0.2) continue
        const tan = pts[s + 1].clone().sub(pts[s - 1]).normalize().multiplyScalar(5)
        b.add(pts[s].clone().add(A), color, 1.5 + rand() * 0.9, (0.55 + rand() * 0.3) * dim, MODE.stream, tan, new Vector3(0.18 + rand() * 0.14, 0, 0), 0.35)
      }
    }
  // A hot, dense core.
  for (let k = 0; k < 160 * scale; k++) {
    const p = new Vector3(gaussian(rand), gaussian(rand), gaussian(rand)).multiplyScalar(r * 0.07).add(A)
    b.add(p, color, 1.6, 0.7 * dim, MODE.still, null, null, 0.45)
  }
}

function spiral({ b, rand, A, r, color, dim, scale }: Ctx) {
  const count = Math.round(1500 * scale)
  for (let k = 0; k < count; k++) {
    let p: Vector3
    if (k < count * 0.18) p = new Vector3(gaussian(rand), gaussian(rand) * 0.45, gaussian(rand)).multiplyScalar(r * 0.12)
    else {
      const arm = k % 2 ? 0 : Math.PI
      const t = Math.pow(rand(), 0.75)
      const rad = r * (0.12 + t * 1.15)
      const ang = arm + t * 4.4 + gaussian(rand) * 0.22
      p = new Vector3(Math.cos(ang) * rad, gaussian(rand) * r * 0.035 * (1.2 - t), Math.sin(ang) * rad)
    }
    const rad = Math.hypot(p.x, p.z) / r
    const omega = 0.045 / Math.sqrt(rad + 0.15) // Keplerian-ish: inner regions turn faster
    b.add(p.add(A), color, 1 + rand() * 1.6, (0.35 + rand() * 0.45) * dim, MODE.orbit, new Vector3(omega, 0, 0), A, 0.35)
  }
}

function circuit({ b, rand, A, r, color, dim, scale, rot }: Ctx) {
  const g = r * 0.13
  const traces = Math.round(30 * scale)
  const dirs = [new Vector3(1, 0, 0), new Vector3(-1, 0, 0), new Vector3(0, 0, 1), new Vector3(0, 0, -1)]
  for (let t = 0; t < traces; t++) {
    const layer = (t % 3) - 1
    const cur = new Vector3(Math.round(gaussian(rand) * 3) * g, layer * r * 0.14, Math.round(gaussian(rand) * 3) * g)
    let dir = dirs[Math.floor(rand() * 4)]
    const steps = 5 + Math.floor(rand() * 10)
    for (let s = 0; s < steps; s++) {
      if (s > 0 && rand() < 0.35) {
        // Right-angle turn — and a via where it happens.
        dir = Math.abs(dir.x) > 0 ? dirs[2 + Math.floor(rand() * 2)] : dirs[Math.floor(rand() * 2)]
        b.add(cur.clone().applyMatrix4(rot).add(A), color, 2.6, 0.75 * dim, MODE.still, null, null, 0.5)
      }
      const next = cur.clone().addScaledVector(dir, g)
      const tan = dir.clone().applyMatrix4(rot).normalize().multiplyScalar(g * 1.6)
      b.polyline([cur.clone().applyMatrix4(rot).add(A), next.clone().applyMatrix4(rot).add(A)], color, 0.16 * dim, MODE.stream)
      for (let q = 0; q < 2; q++) {
        const p = cur.clone().lerp(next, q / 5).applyMatrix4(rot).add(A)
        b.add(p, color, 1.1, 0.42 * dim, MODE.stream, tan, new Vector3(0.45 + rand() * 0.3, 0, 0), 0.3)
      }
      cur.copy(next)
    }
  }
}

function orbitals({ b, rand, A, r, color, dim, scale }: Ctx) {
  const centers = [new Vector3(0, 0, 0), new Vector3(r * 0.42, r * 0.08, r * 0.1), new Vector3(-r * 0.3, -r * 0.06, r * 0.3)]
  centers.forEach((c0, ci) => {
    const c = c0.clone().add(A)
    ;[0.1, 0.19, 0.3].forEach((sr, si) => {
      const count = Math.round([50, 100, 160][si] * scale * (ci === 0 ? 1 : 0.6))
      for (let k = 0; k < count; k++) {
        const y = 1 - ((k + 0.5) / count) * 2
        const rr = Math.sqrt(1 - y * y)
        const th = k * 2.39996
        const p = new Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr).multiplyScalar(sr * r * (1 + gaussian(rand) * 0.03)).add(c)
        b.add(p, color, 1.1 + rand() * 0.6, (0.35 + rand() * 0.25) * dim, MODE.orbit, new Vector3((0.12 - si * 0.03) * (ci % 2 ? -1 : 1), 0, 0), c)
      }
    })
    b.add(c.clone(), color, 3, 0.9 * dim, MODE.still, null, null, 0.5)
    // Two tilted orbit rings per nucleus.
    for (let ring = 0; ring < 2; ring++) {
      const tilt = new Matrix4().makeRotationFromEuler(new Euler(0.6 + ring * 1.1 + ci, ci * 0.7, ring * 0.5))
      const rr = r * (0.19 + ring * 0.11)
      const pts: Vector3[] = []
      for (let k = 0; k <= 48; k++) pts.push(new Vector3(Math.cos((k / 48) * Math.PI * 2) * rr, 0, Math.sin((k / 48) * Math.PI * 2) * rr).applyMatrix4(tilt).add(c))
      b.polyline(pts, color, 0.11 * dim, MODE.stream)
    }
  })
}

function helix({ b, rand, A, r, color, dim, scale, rot }: Ctx) {
  for (const phase of [0, Math.PI]) {
    const pts: Vector3[] = []
    for (let k = 0; k <= 160; k++) {
      const t = k / 160
      const ang = t * Math.PI * 16 + phase
      pts.push(new Vector3((t - 0.5) * r * 1.8, Math.sin(t * Math.PI * 2) * r * 0.15 + Math.cos(ang) * r * 0.11, Math.sin(ang) * r * 0.11).applyMatrix4(rot).add(A))
    }
    b.polyline(pts, color, 0.12 * dim, MODE.stream)
  }
  const count = Math.round(420 * scale)
  const len = r * 1.8
  for (let k = 0; k < count; k++) {
    const t = k / count
    const axis = new Vector3((t - 0.5) * len, Math.sin(t * Math.PI * 2) * r * 0.15, 0)
    const ang = t * Math.PI * 16
    const strand = k % 3
    const rad = r * 0.11
    const off = strand === 2 ? new Vector3(0, Math.cos(ang) * rad * (rand() * 2 - 1), Math.sin(ang) * rad * (rand() * 2 - 1)) : new Vector3(0, Math.cos(ang + strand * Math.PI) * rad, Math.sin(ang + strand * Math.PI) * rad)
    const p = axis.add(off).applyMatrix4(rot).add(A)
    b.add(p, color, strand === 2 ? 0.9 : 1.5, (strand === 2 ? 0.25 : 0.5) * dim, MODE.stream, new Vector3(1, 0, 0).applyMatrix4(rot).multiplyScalar(1.5), new Vector3(0.06, 0, 0))
  }
}

function strata({ b, rand, A, r, color, dim, scale }: Ctx) {
  for (const f of [0.35, 0.55, 0.75, 0.95]) {
    const ring: Vector3[] = []
    for (let k = 0; k <= 64; k++) {
      const a = (k / 64) * Math.PI * 2
      ring.push(new Vector3(Math.cos(a) * f * r, (f - 0.65) * r * 0.2, Math.sin(a) * f * r * 0.85).add(A))
    }
    b.polyline(ring, color, 0.08 * dim, MODE.lattice)
    const count = Math.round(140 * scale * f)
    for (let k = 0; k < count; k++) {
      const a = rand() * Math.PI * 2
      const p = new Vector3(Math.cos(a) * f * r, gaussian(rand) * r * 0.012 + (f - 0.65) * r * 0.2, Math.sin(a) * f * r * 0.85).add(A)
      b.add(p, color, 1.1 + rand(), (0.3 + rand() * 0.3) * dim, MODE.lattice)
    }
  }
}

function dendrites({ b, rand, A, r, color, dim, scale }: Ctx) {
  const somas = 5
  for (let s = 0; s < somas; s++) {
    const soma = new Vector3(gaussian(rand), gaussian(rand) * 0.4, gaussian(rand)).multiplyScalar(r * 0.35)
    b.add(soma.clone().add(A), color, 3, 0.85 * dim, MODE.still, null, null, 0.5)
    const grow = (from: Vector3, dir: Vector3, depth: number) => {
      const p = from.clone()
      const steps = Math.round((10 - depth * 2) * scale) + 3
      const stroke = [p.clone().add(A)]
      for (let k = 0; k < steps; k++) {
        dir.add(new Vector3(gaussian(rand), gaussian(rand) * 0.5, gaussian(rand)).multiplyScalar(0.25)).normalize()
        p.addScaledVector(dir, r * 0.045)
        stroke.push(p.clone().add(A))
        if (k % 2) b.add(p.clone().add(A), color, 1.2, (0.5 - depth * 0.1) * dim, MODE.stream, dir.clone().multiplyScalar(r * 0.07), new Vector3(0.3, 0, 0))
      }
      b.polyline(stroke, color, (0.14 - depth * 0.03) * dim, MODE.stream)
      if (depth < 2) for (let c = 0; c < 2; c++) grow(p, dir.clone().add(new Vector3(gaussian(rand), 0, gaussian(rand)).multiplyScalar(0.8)).normalize(), depth + 1)
    }
    for (let d = 0; d < 3; d++) grow(soma, new Vector3(gaussian(rand), gaussian(rand) * 0.4, gaussian(rand)).normalize(), 0)
  }
}

function blueprint({ b, rand, A, r, color, dim, scale, rot }: Ctx) {
  for (const [ringR, sides] of [[0.35, 6], [0.6, 8], [0.85, 12]] as const) {
    const poly: Vector3[] = []
    for (let k = 0; k <= sides; k++) poly.push(new Vector3(Math.cos((k / sides) * Math.PI * 2), 0, Math.sin((k / sides) * Math.PI * 2)).multiplyScalar(ringR * r).applyMatrix4(rot).add(A))
    b.polyline(poly, color, 0.12 * dim, MODE.lattice)
    const count = Math.round(60 * scale * ringR)
    for (let k = 0; k < count; k++) {
      const t = k / count
      const side = Math.floor(t * sides)
      const f = t * sides - side
      const a0 = (side / sides) * Math.PI * 2
      const a1 = ((side + 1) / sides) * Math.PI * 2
      const p = new Vector3(Math.cos(a0), 0, Math.sin(a0)).lerp(new Vector3(Math.cos(a1), 0, Math.sin(a1)), f).multiplyScalar(ringR * r).applyMatrix4(rot).add(A)
      b.add(p, color, 1.1, 0.4 * dim, MODE.lattice)
    }
  }
  for (let s = 0; s < 12; s++) {
    const a = (s / 12) * Math.PI * 2
    for (let k = 0; k < 10 * scale; k++) {
      const p = new Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(r * (0.35 + (k / 10) * 0.5 + rand() * 0.02)).applyMatrix4(rot).add(A)
      b.add(p, color, 0.9, 0.25 * dim, MODE.lattice)
    }
  }
}

const FORMATION: Record<DomainId, (c: Ctx) => void> = {
  mathematics: lattice,
  physics: fieldLines,
  astronomy: spiral,
  'computer-science': circuit,
  chemistry: orbitals,
  biology: helix,
  'earth-science': strata,
  neuroscience: dendrites,
  engineering: blueprint,
}

/** Builds every formation, concept halo and bridge current into one geometry. */
export function buildFormations(scale: number) {
  const rand = mulberry32(42)
  const layout = getLayout()
  const P = layout.positions
  const b = new Builder(rand)

  for (const d of graph.topics.filter((t) => t.level === 0)) {
    const i = graph.idx(d.id)
    const A = new Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2])
    const r = (layout.domainRadius.get(d.domain) ?? 20) * (d.mapped === false ? 0.9 : 0.8)
    const color = new Color(domainColor[d.domain]).convertSRGBToLinear()
    const rot = new Matrix4().makeRotationFromEuler(new Euler(gaussian(rand) * 0.25, rand() * Math.PI, gaussian(rand) * 0.25))
    FORMATION[d.domain]({ b, rand, A, r, color, dim: d.mapped === false ? 0.6 : 1, scale, rot })
  }

  // Concept halos — density follows how connected an idea is.
  const c = new Color()
  graph.topics.forEach((t, i) => {
    if (t.level === 0) return
    const degree = graph.adj[i].length
    const count = Math.round((2 + degree * 1.4) * scale)
    c.set(domainColor[t.domain]).convertSRGBToLinear()
    const spread = t.level === 1 ? 3.2 : 2.2
    for (let k = 0; k < count; k++) {
      const p = v().set(P[i * 3] + gaussian(rand) * spread, P[i * 3 + 1] + gaussian(rand) * spread * 0.7, P[i * 3 + 2] + gaussian(rand) * spread)
      b.add(p, c, 0.9 + rand() * 1.2, 0.3 + rand() * 0.35, MODE.still)
    }
  })

  // Currents along cross-domain bridges, flowing from what is learned first.
  const flows = new Map<string, number>()
  for (let e = 0; e < graph.edgeSource.length; e++) {
    const a = graph.topics[graph.edgeSource[e]].domain
    const z = graph.topics[graph.edgeTarget[e]].domain
    if (a === z) continue
    const key = `${a}|${z}`
    flows.set(key, (flows.get(key) ?? 0) + 1)
  }
  const done = new Set<string>()
  const ca = new Color()
  const cb = new Color()
  const mix = new Color()
  for (const [key, weight] of flows) {
    const [a, z] = key.split('|')
    const pairKey = a < z ? `${a}|${z}` : `${z}|${a}`
    if (done.has(pairKey)) continue
    done.add(pairKey)
    const total = weight + (flows.get(`${z}|${a}`) ?? 0)
    const ia = graph.idx(a), iz = graph.idx(z)
    const PA = new Vector3(P[ia * 3], P[ia * 3 + 1], P[ia * 3 + 2])
    const PZ = new Vector3(P[iz * 3], P[iz * 3 + 1], P[iz * 3 + 2])
    const M = PA.clone().add(PZ).multiplyScalar(0.5).add(new Vector3(0, 14, 0))
    ca.set(domainColor[a as DomainId]).convertSRGBToLinear()
    cb.set(domainColor[z as DomainId]).convertSRGBToLinear()
    const count = Math.round(Math.min(380, 70 + total * 20) * scale)
    for (let k = 0; k < count; k++) {
      const t = rand()
      const u = 1 - t
      const p = PA.clone().multiplyScalar(u * u).addScaledVector(M, 2 * u * t).addScaledVector(PZ, t * t)
      const tan = M.clone().sub(PA).multiplyScalar(2 * u).addScaledVector(PZ.clone().sub(M), 2 * t).normalize().multiplyScalar(3.5)
      const spread = 1.6 + Math.sin(t * Math.PI) * 4
      p.add(new Vector3(gaussian(rand), gaussian(rand) * 0.6, gaussian(rand)).multiplyScalar(spread))
      mix.copy(ca).lerp(cb, t)
      b.add(p, mix, 0.9 + rand() * 1.1, 0.22 + rand() * 0.28, MODE.stream, tan, new Vector3(0.05 + rand() * 0.05, 0, 0))
    }
  }

  return { points: b.geometry(), lines: b.lineGeometry() }
}

/** Faint motes near the camera: they only exist to give parallax while travelling. */
export function buildMotes(count: number) {
  const rand = mulberry32(9)
  const b = new Builder(rand)
  const white = new Color('#c9d4ff')
  for (let k = 0; k < count; k++) {
    b.add(new Vector3(rand() * 140 - 70, rand() * 140 - 70, rand() * 140 - 70), white, 1 + rand() * 1.5, 0.12 + rand() * 0.18, MODE.still, null, null, 0)
  }
  return b.geometry()
}
