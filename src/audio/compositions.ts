import { bell, drone, midi, padTone, pluck, prng, wind, type Bus } from './dsp'

/**
 * The three pieces of the soundtrack — composed for this universe, performed
 * live by the browser. Each is generative: the harmony follows a written
 * progression while ornaments (stars, bells, motifs) are placed by a seeded
 * random process, so the music never loops audibly yet always sounds like
 * itself.
 */
export interface Composition {
  /** Schedule events up to `until` (seconds on the audio clock). */
  schedule(until: number): void
  /** Let everything fade and stop from `at`. */
  stop(at: number): void
}

export type Compose = (bus: Bus, t0: number) => Composition

/** Symmetric stereo position for voice k of n, from -0.5 (left) to +0.5 (right). */
const spread = (k: number, n: number) => (n <= 1 ? 0 : k / (n - 1) - 0.5)

/** Helper: a repeating event with jitter, scheduled ahead of time. */
function cadence(first: number, next: () => number, fire: (t: number, n: number) => void) {
  let t = first
  let n = 0
  return (until: number) => {
    while (t < until) {
      fire(t, n++)
      t += next()
    }
  }
}

/** ORIGIN — entering the universe. D Lydian, open fifths, patient light. */
export const origin: Compose = (bus, t0) => {
  const r = prng(1)
  const chords = [
    [38, 45, 52, 54, 61], // Dmaj9
    [35, 42, 50, 57, 64], // Bm11
    [31, 50, 54, 59, 61], // Gmaj7♯11
    [40, 47, 54, 55, 62], // Em9
  ]
  const stars = [74, 76, 78, 81, 83, 85, 86, 88]
  const stopDrone = drone(bus, midi(26), t0, { level: 0.045, breathe: 0.05 })
  const stopFifth = drone(bus, midi(33), t0 + 6, { level: 0.018, breathe: 0.035 })
  const pads = cadence(t0 + 0.5, () => 13, (t, n) => {
    const chord = chords[n % chords.length]
    chord.forEach((note, k) => {
      if (k === 0) padTone(bus, midi(note), t, 18, { type: 'sine', level: 0.03, attack: 5, release: 6, cutoff: [400, 500], wet: 0.4 })
      else padTone(bus, midi(note), t, 18, { type: 'sawtooth', level: 0.016, attack: 5.5, release: 6.5, cutoff: [480, 950], pan: spread(k, chord.length) * 1.1, wet: 0.7 })
    })
    // Every other chord, a high shimmer of the fifth.
    if (n % 2 === 1) padTone(bus, midi(chord[1] + 36), t + 3, 12, { type: 'triangle', level: 0.006, attack: 5, release: 6, cutoff: [2200, 3200], pan: 0.3, wet: 1.2 })
  })
  const starfield = cadence(t0 + 4, () => 2.5 + r() * 4.5, (t) => {
    if (r() < 0.72) bell(bus, midi(stars[Math.floor(r() * stars.length)]), t, { level: 0.03, decay: 6.5, pan: r() * 1.6 - 0.8, wet: 1.4 })
  })
  return {
    schedule(until) {
      pads(until)
      starfield(until)
    },
    stop(at) {
      stopDrone(at)
      stopFifth(at)
    },
  }
}

/** DEEP SPACE — going deeper into difficult knowledge. A Aeolian, low, windswept, patient. */
export const deepSpace: Compose = (bus, t0) => {
  const r = prng(2)
  const chords = [
    [45, 52, 59, 60, 64], // Am(add9)
    [41, 48, 52, 57], // Fmaj7
    [38, 45, 53, 52, 60], // Dm9
    [40, 47, 57, 64], // Esus4
  ]
  const lowBells = [57, 60, 64, 69]
  const stopDrone = drone(bus, midi(33), t0, { level: 0.055, breathe: 0.04 })
  const stopWind = wind(bus, t0 + 2, { level: 0.016, low: 160, high: 700 })
  const pads = cadence(t0 + 1, () => 17, (t, n) => {
    const chord = chords[n % chords.length]
    chord.forEach((note, k) =>
      padTone(bus, midi(note), t, 23, { type: 'triangle', level: k === 0 ? 0.03 : 0.022, attack: 7, release: 8, cutoff: [320, 680], pan: spread(k, chord.length) * 1.2, detune: 5, wet: 0.9 }),
    )
  })
  const bells = cadence(t0 + 7, () => 9 + r() * 7, (t) => {
    bell(bus, midi(lowBells[Math.floor(r() * lowBells.length)]), t, { level: 0.034, decay: 9, pan: r() * 1.2 - 0.6, wet: 1.6, bright: 0.55 })
  })
  // Rare distant signals, high and faint.
  const signals = cadence(t0 + 21, () => 14 + r() * 12, (t) => {
    if (r() < 0.45) bell(bus, midi([88, 91, 93][Math.floor(r() * 3)]), t, { level: 0.01, decay: 7, pan: r() * 2 - 1, wet: 2 })
  })
  return {
    schedule(until) {
      pads(until)
      bells(until)
      signals(until)
    },
    stop(at) {
      stopDrone(at)
      stopWind(at)
    },
  }
}

/** FRONTIER — discovering something new. E major, 84 BPM, a gentle pulse and a rising question. */
export const frontier: Compose = (bus, t0) => {
  const { ctx } = bus
  const r = prng(3)
  const beat = 60 / 84
  const chords = [
    [40, 47, 54, 56, 63], // Emaj9
    [37, 44, 52, 56, 59], // C♯m7
    [33, 45, 52, 56, 63], // Amaj7♯11 colour
    [35, 42, 52, 54, 61], // Bsus
  ]
  // A dotted-eighth echo gives the arpeggio its sense of motion.
  const echoIn = ctx.createGain()
  const delay = ctx.createDelay(2)
  delay.delayTime.value = beat * 0.75
  const feedback = ctx.createGain()
  feedback.gain.value = 0.34
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 2600
  echoIn.connect(delay).connect(tone).connect(feedback).connect(delay)
  tone.connect(bus.dry)
  tone.connect(bus.wet)
  echoIn.connect(bus.dry)
  const echoBus: Bus = { ctx, dry: echoIn, wet: bus.wet }

  const bar = beat * 4
  const pads = cadence(t0 + 0.2, () => bar * 2, (t, n) => {
    const chord = chords[n % chords.length]
    chord.forEach((note, k) =>
      padTone(bus, midi(note), t, bar * 2 + 1.5, { type: 'sawtooth', level: k === 0 ? 0.02 : 0.013, attack: 2.2, release: 2.8, cutoff: [650, 1350], pan: spread(k, chord.length), wet: 0.6 }),
    )
    // Soft pulse on the root.
    for (let b = 0; b < 8; b += 2) pluck(bus, midi(chord[0] + 12), t + b * beat, { level: 0.03, decay: 1.5, cutoff: 700, wet: 0.3 })
  })
  const pattern = [0, 2, 4, 3, 1, 3, 4, 2]
  const arp = cadence(t0 + bar, () => beat / 2, (t, n) => {
    const chord = chords[Math.floor((t - t0 - 0.2) / (bar * 2)) % chords.length] ?? chords[0]
    const tones = chord.slice(1).map((x) => x + 12)
    const note = tones[pattern[n % pattern.length] % tones.length]
    // Breathe: the arpeggio thins out now and then.
    if (n % 32 >= 28 || r() < 0.12) return
    pluck(echoBus, midi(note), t, { level: 0.022 + (n % 2 ? 0 : 0.006), decay: 1.2, pan: ((n % 4) / 3 - 0.5) * 0.9, cutoff: 2600, wet: 0.5 })
  })
  const motif = cadence(t0 + bar * 4, () => bar * 4, (t, n) => {
    const rise = n % 2 === 0 ? [71, 76, 78] : [71, 76, 80]
    rise.forEach((note, k) => bell(bus, midi(note), t + k * beat, { level: 0.022, decay: 4.5, pan: -0.3 + k * 0.3, wet: 1.3 }))
  })
  return {
    schedule(until) {
      pads(until)
      arp(until)
      motif(until)
    },
    stop(at) {
      feedback.gain.setTargetAtTime(0, at, 0.8)
    },
  }
}
