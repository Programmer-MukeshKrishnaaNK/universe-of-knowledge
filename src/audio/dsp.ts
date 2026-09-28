/**
 * Small synthesis toolkit for the soundtrack. Everything is built from Web
 * Audio primitives (oscillators, filters, a generated convolution reverb),
 * so the music is original, owned by the project, and costs no download.
 * Works on both realtime and offline contexts (offline renders previews).
 */

export const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

/** Deterministic PRNG so each composition has its own recognisable character. */
export function prng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A long, dark, stereo hall made from shaped noise. */
export function makeReverb(ctx: BaseAudioContext, seconds = 6.5, decay = 1.9, darkness = 3) {
  const rate = ctx.sampleRate
  const length = Math.floor(rate * seconds)
  const ir = ctx.createBuffer(2, length, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch)
    const r = prng(17 + ch)
    for (let i = 0; i < length; i++) data[i] = (r() * 2 - 1) * Math.exp(-i / rate / decay)
    // Gentle low-pass by repeated averaging: distant, not metallic.
    for (let pass = 0; pass < darkness; pass++) for (let i = 1; i < length; i++) data[i] = data[i] * 0.55 + data[i - 1] * 0.45
    // Soft onset so the reverb blooms rather than clicks.
    for (let i = 0; i < Math.min(length, rate * 0.08); i++) data[i] *= i / (rate * 0.08)
  }
  const node = ctx.createConvolver()
  node.buffer = ir
  return node
}

export interface Bus {
  /** Dry signal into the track mix. */
  dry: AudioNode
  /** Send into the shared reverb. */
  wet: AudioNode
  ctx: BaseAudioContext
}

/** A slow pad chord tone: detuned oscillators through a moving low-pass, with long swells. */
export function padTone(
  bus: Bus,
  freq: number,
  t0: number,
  dur: number,
  opt: { type?: OscillatorType; level?: number; attack?: number; release?: number; cutoff?: [number, number]; pan?: number; detune?: number; wet?: number },
) {
  const { ctx } = bus
  const level = opt.level ?? 0.03
  const attack = Math.min(opt.attack ?? 4, dur * 0.45)
  const release = Math.min(opt.release ?? 5, dur * 0.5)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(level, t0 + attack)
  g.gain.setValueAtTime(level, t0 + dur - release)
  g.gain.linearRampToValueAtTime(0.0001, t0 + dur)
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.Q.value = 0.4
  const [c0, c1] = opt.cutoff ?? [700, 1100]
  f.frequency.setValueAtTime(c0, t0)
  f.frequency.linearRampToValueAtTime(c1, t0 + dur * 0.6)
  f.frequency.linearRampToValueAtTime(c0 * 0.9, t0 + dur)
  const spread = opt.detune ?? 7
  for (const d of [-spread, 0, spread]) {
    const o = ctx.createOscillator()
    o.type = opt.type ?? 'sawtooth'
    o.frequency.value = freq
    o.detune.value = d
    o.connect(f)
    o.start(t0)
    o.stop(t0 + dur + 0.05)
  }
  const p = ctx.createStereoPanner()
  p.pan.value = opt.pan ?? 0
  f.connect(g).connect(p)
  p.connect(bus.dry)
  const send = ctx.createGain()
  send.gain.value = opt.wet ?? 0.6
  p.connect(send).connect(bus.wet)
}

/** A struck, slightly inharmonic bell — the "light" in the music. */
export function bell(bus: Bus, freq: number, t0: number, opt: { level?: number; decay?: number; pan?: number; wet?: number; bright?: number } = {}) {
  const { ctx } = bus
  const level = opt.level ?? 0.05
  const decay = opt.decay ?? 5
  const p = ctx.createStereoPanner()
  p.pan.value = opt.pan ?? 0
  // Partials of a soft glass bell (inharmonic ratios give the "star" quality).
  const partials: [number, number][] = [
    [1, 1],
    [2.76, 0.32 * (opt.bright ?? 1)],
    [5.4, 0.12 * (opt.bright ?? 1)],
  ]
  for (const [ratio, amp] of partials) {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = freq * ratio
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(level * amp, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.00001, t0 + decay / ratio ** 0.6)
    o.connect(g).connect(p)
    o.start(t0)
    o.stop(t0 + decay + 0.1)
  }
  p.connect(bus.dry)
  const send = ctx.createGain()
  send.gain.value = opt.wet ?? 1.2
  p.connect(send).connect(bus.wet)
}

/** A soft, filtered pluck for pulses and arpeggios. */
export function pluck(bus: Bus, freq: number, t0: number, opt: { level?: number; decay?: number; pan?: number; cutoff?: number; wet?: number } = {}) {
  const { ctx } = bus
  const o = ctx.createOscillator()
  o.type = 'triangle'
  o.frequency.value = freq
  const f = ctx.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.setValueAtTime(opt.cutoff ?? 2400, t0)
  f.frequency.exponentialRampToValueAtTime(420, t0 + 0.6)
  const g = ctx.createGain()
  const level = opt.level ?? 0.05
  const decay = opt.decay ?? 1.4
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(level, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.00001, t0 + decay)
  const p = ctx.createStereoPanner()
  p.pan.value = opt.pan ?? 0
  o.connect(f).connect(g).connect(p)
  p.connect(bus.dry)
  const send = ctx.createGain()
  send.gain.value = opt.wet ?? 0.7
  p.connect(send).connect(bus.wet)
  o.start(t0)
  o.stop(t0 + decay + 0.05)
}

/** A continuous low drone with a slow breathing tremolo. Returns a stop function. */
export function drone(bus: Bus, freq: number, t0: number, opt: { level?: number; breathe?: number } = {}) {
  const { ctx } = bus
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(opt.level ?? 0.05, t0 + 8)
  const oscs = [1, 2.003].map((ratio, k) => {
    const o = ctx.createOscillator()
    o.type = k === 0 ? 'sine' : 'triangle'
    o.frequency.value = freq * ratio
    const og = ctx.createGain()
    og.gain.value = k === 0 ? 1 : 0.18
    o.connect(og).connect(g)
    o.start(t0)
    return o
  })
  const lfo = ctx.createOscillator()
  lfo.frequency.value = opt.breathe ?? 0.07
  const depth = ctx.createGain()
  depth.gain.value = (opt.level ?? 0.05) * 0.35
  lfo.connect(depth).connect(g.gain)
  lfo.start(t0)
  g.connect(bus.dry)
  return (at: number) => {
    g.gain.cancelScheduledValues(at)
    g.gain.setTargetAtTime(0.0001, at, 1.2)
    for (const o of [...oscs, lfo]) o.stop(at + 6)
  }
}

/** Slowly moving band-passed noise — cosmic wind. Returns a stop function. */
export function wind(bus: Bus, t0: number, opt: { level?: number; low?: number; high?: number } = {}) {
  const { ctx } = bus
  const seconds = 4
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
  const d = buf.getChannelData(0)
  const r = prng(99)
  for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.loop = true
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = 3
  f.frequency.value = opt.low ?? 220
  const lfo = ctx.createOscillator()
  lfo.frequency.value = 0.031
  const depth = ctx.createGain()
  depth.gain.value = ((opt.high ?? 900) - (opt.low ?? 220)) / 2
  lfo.connect(depth).connect(f.frequency)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.linearRampToValueAtTime(opt.level ?? 0.02, t0 + 10)
  src.connect(f).connect(g)
  g.connect(bus.dry)
  const send = ctx.createGain()
  send.gain.value = 0.8
  g.connect(send).connect(bus.wet)
  src.start(t0)
  lfo.start(t0)
  return (at: number) => {
    g.gain.cancelScheduledValues(at)
    g.gain.setTargetAtTime(0.0001, at, 1.5)
    src.stop(at + 6)
    lfo.stop(at + 6)
  }
}
