import { CatmullRomCurve3, CubicBezierCurve3, type Curve, PerspectiveCamera, Spherical, Vector3 } from 'three'
import { clamp, damp, prefersReducedMotion, smootherstep } from '../lib/motion'

interface Flight {
  t: number
  duration: number
  /** Anticipation: a short backward breath before the journey starts. */
  wind: { from: Vector3; to: Vector3; duration: number; t: number } | null
  path: Curve<Vector3>
  look: Curve<Vector3> | null
  look0: Vector3
  look1: Vector3
  onProgress?: (t: number) => void
  onArrive?: () => void
}

const UP = new Vector3(0, 1, 0)
const tmp = new Vector3()
const tmp2 = new Vector3()

/**
 * The camera is the most important object in the experience.
 *
 * Free mode is an orbit rig with real inertia (angular / zoom / pan
 * velocities that decay exponentially). Flight mode moves along authored
 * curves: an arcing Bézier for a single hop, a Catmull–Rom spline through
 * waypoints for search routes. The gaze leads the body slightly — the camera
 * "turns its head" before it travels — and arrival hands control back to the
 * orbit rig with no discontinuity.
 */
export class CameraRig {
  camera: PerspectiveCamera | null = null
  readonly target = new Vector3()
  readonly spherical = new Spherical(420, 1.2, 0.6)
  private vTheta = 0
  private vPhi = 0
  private vZoom = 0
  private readonly vPan = new Vector3()
  private accTheta = 0
  private accPhi = 0
  private readonly accPan = new Vector3()
  private zoomNdc = { x: 0, y: 0 }
  dragging = false
  flight: Flight | null = null
  /** Bank (roll) into turns while flying, radians. */
  private roll = 0
  private yawRate = 0
  private readonly prevForward = new Vector3(0, 0, -1)
  private idle = 0
  private drift = 0
  minRadius = 5
  maxRadius = 720

  /** Horizontal/vertical projection shift (fraction of the viewport) so the focus sits beside the panel. */
  shiftX = 0
  shiftXT = 0
  shiftY = 0
  shiftYT = 0

  get position() {
    return this.camera?.position ?? new Vector3()
  }

  get busy() {
    return this.flight !== null
  }

  attach(camera: PerspectiveCamera) {
    this.camera = camera
    this.apply()
  }

  // ─── Input ────────────────────────────────────────────────────────────

  private interrupt() {
    this.idle = 0
    this.drift = 0
    if (!this.flight || !this.camera) return
    // Hand control back mid-flight exactly where we are, looking where we look.
    const look = this.currentLook(tmp2)
    this.target.copy(look)
    this.spherical.setFromVector3(tmp.copy(this.camera.position).sub(look))
    this.flight = null
  }

  orbit(dx: number, dy: number) {
    this.interrupt()
    this.accTheta -= dx * 0.0052
    this.accPhi -= dy * 0.0042
  }

  pan(dx: number, dy: number) {
    this.interrupt()
    if (!this.camera) return
    const scale = (this.spherical.radius * Math.tan((this.camera.fov * Math.PI) / 360) * 2) / window.innerHeight
    const right = tmp.setFromMatrixColumn(this.camera.matrix, 0)
    const up = tmp2.setFromMatrixColumn(this.camera.matrix, 1)
    this.accPan.addScaledVector(right, -dx * scale).addScaledVector(up, dy * scale)
  }

  zoom(delta: number, ndcX = 0, ndcY = 0) {
    this.interrupt()
    this.vZoom += delta
    this.zoomNdc.x = ndcX
    this.zoomNdc.y = ndcY
  }

  // ─── Flights ──────────────────────────────────────────────────────────

  private currentLook(out: Vector3) {
    if (!this.camera) return out.copy(this.target)
    this.camera.getWorldDirection(out)
    const d = this.flight ? this.camera.position.distanceTo(this.flight.look1) : this.spherical.radius
    return out.multiplyScalar(d).add(this.camera.position)
  }

  /** Arcing hop to look at `look` from `position`. */
  flyTo(look: Vector3, position: Vector3, opts: { onArrive?: () => void; onProgress?: (t: number) => void; speed?: number } = {}) {
    if (!this.camera) return
    const p0 = this.camera.position.clone()
    const look0 = this.flight ? this.currentLook(new Vector3()) : this.target.clone()
    const dist = p0.distanceTo(position)
    const reduced = prefersReducedMotion()

    let path: Curve<Vector3>
    let wind: Flight['wind'] = null
    if (reduced) {
      path = new CubicBezierCurve3(p0, p0.clone().lerp(position, 0.33), p0.clone().lerp(position, 0.66), position.clone())
    } else {
      // Major journeys begin with a breath: ease back a little, pause, then go.
      if (dist > 28 && !this.flight) {
        const away = p0.clone().sub(look0).normalize().multiplyScalar(Math.min(dist * 0.035, 5.5))
        wind = { from: p0.clone(), to: p0.clone().add(away), duration: 0.34, t: 0 }
        p0.copy(wind.to)
      }
      // Rise gently above the plane of travel, then glide in along the final view direction.
      const lift = UP.clone().multiplyScalar(Math.min(dist * 0.2, 46))
      const back = p0.clone().sub(look0).normalize().multiplyScalar(Math.min(dist * 0.12, 26))
      const arriveDir = position.clone().sub(look).normalize()
      const c1 = p0.clone().lerp(position, 0.28).add(lift).add(back)
      const c2 = position.clone().addScaledVector(arriveDir, Math.min(dist * 0.28, 60)).addScaledVector(lift, 0.35)
      path = new CubicBezierCurve3(p0, c1, c2, position.clone())
    }
    const base = reduced ? 0.55 : clamp(1.25 + dist / 125, 1.35, 3.1)
    this.flight = {
      t: 0,
      duration: base / (opts.speed ?? 1),
      wind,
      path,
      look: null,
      look0,
      look1: look.clone(),
      onArrive: opts.onArrive,
      onProgress: opts.onProgress,
    }
    this.vTheta = this.vPhi = this.vZoom = 0
    this.vPan.set(0, 0, 0)
    this.idle = 0
    this.drift = 0
  }

  /** Travel through a sequence of waypoints (search routes). */
  flyRoute(lookPoints: Vector3[], positions: Vector3[], opts: { onArrive?: () => void; onProgress?: (t: number) => void } = {}) {
    if (!this.camera) return
    if (prefersReducedMotion() || lookPoints.length < 2) {
      this.flyTo(lookPoints[lookPoints.length - 1], positions[positions.length - 1], opts)
      return
    }
    const p0 = this.camera.position.clone()
    const look0 = this.flight ? this.currentLook(new Vector3()) : this.target.clone()
    const path = new CatmullRomCurve3([p0, ...positions], false, 'centripetal', 0.5)
    const look = new CatmullRomCurve3([look0, ...lookPoints], false, 'centripetal', 0.5)
    const length = path.getLength()
    this.flight = {
      t: 0,
      duration: clamp(1.6 + length / 150 + positions.length * 0.35, 2.2, 5.4),
      wind: null,
      path,
      look,
      look0,
      look1: lookPoints[lookPoints.length - 1].clone(),
      onArrive: opts.onArrive,
      onProgress: opts.onProgress,
    }
    this.vTheta = this.vPhi = this.vZoom = 0
    this.vPan.set(0, 0, 0)
  }

  // ─── Frame ────────────────────────────────────────────────────────────

  update(dt: number, viewport: { width: number; height: number }) {
    const cam = this.camera
    if (!cam) return
    dt = Math.min(dt, 1 / 20)
    const reduced = prefersReducedMotion()

    if (this.flight) {
      const f = this.flight
      if (f.wind && f.wind.t < f.wind.duration) {
        // Anticipation — the gaze starts to turn while the body draws back.
        f.wind.t += dt
        const u = smootherstep(f.wind.t / f.wind.duration)
        cam.position.copy(f.wind.from).lerp(f.wind.to, u)
        cam.up.copy(UP)
        cam.lookAt(tmp2.copy(f.look0).lerp(f.look1, u * 0.05))
      } else {
        f.t = Math.min(1, f.t + dt / f.duration)
        const e = smootherstep(f.t)
        cam.position.copy(f.path.getPointAt(e, tmp))
        // The gaze leads the body: it settles on the destination before we arrive.
        const le = smootherstep(Math.min(1, f.t * 1.3))
        const look = f.look ? f.look.getPointAt(Math.min(1, e * 1.08), tmp2) : tmp2.copy(f.look0).lerp(f.look1, 0.05 + 0.95 * le)
        cam.up.copy(UP)
        cam.lookAt(look)
      }
      this.bank(cam, dt, reduced)
      f.onProgress?.(f.t)
      if (f.t >= 1) {
        this.target.copy(f.look1)
        this.spherical.setFromVector3(tmp.copy(cam.position).sub(f.look1))
        this.flight = null
        // Settle: carry a whisper of momentum into the orbit instead of stopping dead.
        if (!reduced) {
          this.vTheta = clamp(-this.yawRate * 0.22, -0.045, 0.045)
          this.zoomNdc.x = this.zoomNdc.y = 0
          this.vZoom = -0.05
        }
        f.onArrive?.()
      }
    } else {
      // Angular inertia.
      if (this.dragging || this.accTheta || this.accPhi) {
        const k = 1 - Math.exp(-dt * 30)
        this.vTheta += (this.accTheta / Math.max(dt, 1e-3) - this.vTheta) * k
        this.vPhi += (this.accPhi / Math.max(dt, 1e-3) - this.vPhi) * k
        this.spherical.theta += this.accTheta
        this.spherical.phi += this.accPhi
        this.accTheta = this.accPhi = 0
      } else {
        this.spherical.theta += this.vTheta * dt
        this.spherical.phi += this.vPhi * dt
        const decay = Math.exp(-dt * 3.2)
        this.vTheta *= decay
        this.vPhi *= decay
      }
      this.spherical.phi = clamp(this.spherical.phi, 0.1, Math.PI - 0.1)

      // Pan inertia.
      if (this.accPan.lengthSq() > 0) {
        this.target.add(this.accPan)
        this.vPan.lerp(tmp.copy(this.accPan).divideScalar(Math.max(dt, 1e-3)), 1 - Math.exp(-dt * 30))
        this.accPan.set(0, 0, 0)
      } else {
        this.target.addScaledVector(this.vPan, dt)
        this.vPan.multiplyScalar(Math.exp(-dt * 4))
      }

      // Inertial zoom towards the cursor.
      if (Math.abs(this.vZoom) > 1e-4) {
        const before = this.spherical.radius
        const after = clamp(before * Math.exp(this.vZoom * dt), this.minRadius, this.maxRadius)
        if (after < before) {
          const ray = tmp.set(this.zoomNdc.x, this.zoomNdc.y, 0.5).unproject(cam).sub(cam.position).normalize()
          const point = tmp2.copy(cam.position).addScaledVector(ray, before)
          this.target.lerp(point, 1 - after / before)
        }
        this.spherical.radius = after
        this.vZoom *= Math.exp(-dt * 5.5)
      }

      // Ambient drift — the universe breathes when left alone.
      this.idle += dt
      if (!reduced) {
        this.drift = damp(this.drift, this.idle > 3.5 ? 1 : 0, 0.5, dt)
        this.spherical.theta += this.drift * dt * 0.018
      }

      this.roll = damp(this.roll, 0, 3, dt)
      this.yawRate = damp(this.yawRate, 0, 6, dt)
      this.camera!.getWorldDirection(this.prevForward)
      this.apply()
    }

    // Keep the subject clear of the reading panel.
    this.shiftX = damp(this.shiftX, this.shiftXT, reduced ? 12 : 3.2, dt)
    this.shiftY = damp(this.shiftY, this.shiftYT, reduced ? 12 : 3.2, dt)
    const w = viewport.width, h = viewport.height
    if (Math.abs(this.shiftX) > 1e-4 || Math.abs(this.shiftY) > 1e-4) {
      cam.setViewOffset(w, h, this.shiftX * w, this.shiftY * h, w, h)
    } else if (cam.view?.enabled) {
      cam.clearViewOffset()
    }
  }

  private apply() {
    if (!this.camera) return
    this.camera.position.setFromSpherical(this.spherical).add(this.target)
    this.camera.up.copy(UP)
    this.camera.lookAt(this.target)
    if (Math.abs(this.roll) > 1e-4) this.camera.rotateZ(this.roll)
  }

  /** Bank gently into turns, like a craft rather than a tripod. */
  private bank(cam: PerspectiveCamera, dt: number, reduced: boolean) {
    const fwd = cam.getWorldDirection(tmp)
    const yaw = this.prevForward.x * fwd.z - this.prevForward.z * fwd.x
    this.prevForward.copy(fwd)
    this.yawRate = damp(this.yawRate, yaw / Math.max(dt, 1e-3), 6, dt)
    const target = reduced ? 0 : clamp(-this.yawRate * 0.14, -0.075, 0.075) // right turn → right wing down
    this.roll = damp(this.roll, target, 3.5, dt)
    cam.rotateZ(this.roll)
  }

  /** Current camera → target direction as a basis for arranging a focus. */
  static basisFor(position: Vector3, look: Vector3) {
    const forward = look.clone().sub(position).normalize()
    const right = new Vector3().crossVectors(forward, UP).normalize()
    const up = new Vector3().crossVectors(right, forward).normalize()
    return { forward, right, up }
  }
}
