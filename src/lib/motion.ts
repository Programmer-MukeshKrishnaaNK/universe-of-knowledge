/** Easing and damping primitives shared by every animated system. */

export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Quintic smootherstep — zero velocity and zero acceleration at both ends. */
export const smootherstep = (t: number) => {
  t = clamp(t, 0, 1)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/** Asymmetric ease: gentle departure, long graceful arrival. */
export const cinematic = (t: number) => {
  t = clamp(t, 0, 1)
  // Blend of ease-in-out-cubic and ease-out-quart, weighted towards the end.
  const a = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  const b = 1 - Math.pow(1 - t, 4)
  return lerp(a, b, t * 0.55)
}

/** Frame-rate independent exponential approach. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt))

/**
 * Critically damped spring (Game Programming Gems 4, "SmoothDamp").
 * Mutates `state` = [value, velocity]. Stable at any timestep.
 */
export function springTo(state: Float32Array, i: number, vel: Float32Array, target: number, omega: number, dt: number) {
  const x = state[i]
  const v = vel[i]
  const o = omega * dt
  const exp = 1 / (1 + o + 0.48 * o * o + 0.235 * o * o * o)
  const change = x - target
  const temp = (v + omega * change) * dt
  vel[i] = (v - omega * temp) * exp
  state[i] = target + (change + temp) * exp
}

let reduced = false
if (typeof window !== 'undefined' && window.matchMedia) {
  // `?motion=reduced` forces calm transitions regardless of the OS setting.
  const forced = new URLSearchParams(window.location.search).get('motion') === 'reduced'
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  reduced = forced || mq.matches
  mq.addEventListener?.('change', (e) => (reduced = forced || e.matches))
  if (forced) document.documentElement.dataset.motion = 'reduced'
}
export const prefersReducedMotion = () => reduced
