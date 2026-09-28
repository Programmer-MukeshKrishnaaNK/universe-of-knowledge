import { deepSpace, frontier, origin, type Compose, type Composition } from './compositions'
import { makeReverb, type Bus } from './dsp'

export type TrackId = 'origin' | 'deep-space' | 'frontier'
export type MusicChoice = TrackId | 'off'

/**
 * A soundtrack track. `compose` performs it live; `src` (optional) points to
 * a recorded file that replaces the live performance when present — drop a
 * file in /public/audio and set `src`, nothing else changes. If a file fails
 * to load, the track falls back to its composition.
 */
export interface MusicTrack {
  id: TrackId
  title: string
  mood: string
  compose: Compose
  src?: string
  /** Level trim so every track sits at the same loudness (measured, see README). */
  trim: number
}

export const TRACKS: MusicTrack[] = [
  { id: 'origin', title: 'Origin', mood: 'Entering the universe — spacious, calm, slow discovery.', compose: origin, trim: 1 },
  { id: 'deep-space', title: 'Deep Space', mood: 'Going deeper — atmospheric, darker, intellectual.', compose: deepSpace, trim: 0.8 },
  { id: 'frontier', title: 'Frontier', mood: 'Discovering something new — gentle momentum and wonder.', compose: frontier, trim: 2.3 },
]

const CROSSFADE = 3.5
const LOOKAHEAD = 2
const TICK_MS = 250

interface Voice {
  track: MusicTrack
  /** Dry output (fades with the voice). */
  out: GainNode
  /** Reverb send (fades with the voice, so a departing track leaves no stray tail). */
  wetFade: GainNode
  /** Per-voice tone control — the only thing the universe's "energy" touches. */
  tone: BiquadFilterNode
  composition?: Composition
  file?: AudioBufferSourceNode
}

export type EngineState = 'idle' | 'waiting' | 'playing' | 'blocked' | 'unsupported'

/**
 * The music engine. One AudioContext (created only after a user gesture, per
 * browser autoplay policy), a master chain, and at most two voices at a time
 * while crossfading. Every failure is contained: the universe never breaks
 * because of audio.
 */
export class MusicEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private reverb: ConvolverNode | null = null
  private voice: Voice | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private buffers = new Map<string, Promise<AudioBuffer | null>>()
  private volume = 0.6
  private muted = false
  private desired: MusicChoice = 'off'
  private energy = 0
  state: EngineState = 'idle'
  onState?: (s: EngineState) => void

  /** The track list is injectable, so recorded files (or tests) can replace any piece. */
  constructor(private tracks: MusicTrack[] = TRACKS) {}

  private setState(s: EngineState) {
    if (this.state === s) return
    this.state = s
    this.onState?.(s)
  }

  /** Called from a user gesture: create / resume the audio context. */
  async unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AC) {
          this.setState('unsupported')
          return
        }
        this.ctx = new AC({ latencyHint: 'playback' })
        const comp = this.ctx.createDynamicsCompressor()
        comp.threshold.value = -20
        comp.ratio.value = 3
        comp.attack.value = 0.05
        comp.release.value = 0.4
        this.master = this.ctx.createGain()
        this.master.gain.value = this.muted ? 0 : this.volume
        this.master.connect(comp).connect(this.ctx.destination)
        this.reverb = makeReverb(this.ctx)
        const reverbReturn = this.ctx.createGain()
        reverbReturn.gain.value = 0.55
        this.reverb.connect(reverbReturn).connect(this.master)
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      if (this.ctx.state !== 'running') {
        this.setState('blocked')
        return
      }
      this.apply()
    } catch {
      this.setState('blocked')
    }
  }

  get unlocked() {
    return this.ctx?.state === 'running'
  }

  setChoice(choice: MusicChoice) {
    this.desired = choice
    if (this.unlocked) this.apply()
    else this.setState(choice === 'off' ? 'idle' : 'waiting')
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v))
    this.rampMaster()
  }

  setMuted(m: boolean) {
    this.muted = m
    this.rampMaster()
  }

  /** Subtle, never-authoritative response to the universe: 0 = resting, 1 = travelling. */
  setEnergy(e: number) {
    this.energy = Math.min(1, Math.max(0, e))
    const v = this.voice
    if (!v || !this.ctx) return
    const now = this.ctx.currentTime
    v.tone.frequency.cancelScheduledValues(now)
    v.tone.frequency.setTargetAtTime(5200 + this.energy * 4200, now, 1.4)
  }

  private rampMaster() {
    if (!this.master || !this.ctx) return
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, now, 0.25)
  }

  /** Bring the audio graph in line with the desired track, crossfading. */
  private apply() {
    const ctx = this.ctx
    if (!ctx || !this.master || !this.reverb) return
    const want = this.desired
    if (this.voice && this.voice.track.id === want) {
      this.setState('playing')
      return
    }
    const now = ctx.currentTime
    if (this.voice) this.fadeOut(this.voice, now)
    this.voice = null
    if (want === 'off') {
      this.stopTicking()
      this.setState('idle')
      return
    }
    const track = this.tracks.find((t) => t.id === want)
    if (!track) return
    const out = ctx.createGain()
    out.gain.setValueAtTime(0.0001, now)
    out.gain.linearRampToValueAtTime(track.trim, now + CROSSFADE)
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 5200 + this.energy * 4200
    tone.connect(out).connect(this.master)
    const wet = ctx.createGain()
    const wetFade = ctx.createGain()
    wetFade.gain.setValueAtTime(0.0001, now)
    wetFade.gain.linearRampToValueAtTime(track.trim, now + CROSSFADE)
    wet.connect(wetFade).connect(this.reverb)
    const voice: Voice = { track, out, wetFade, tone }
    this.voice = voice
    const bus: Bus = { ctx, dry: tone, wet }
    if (track.src) {
      void this.playFile(voice, track, bus, now)
    } else {
      voice.composition = track.compose(bus, now + 0.05)
      voice.composition.schedule(now + LOOKAHEAD)
      this.startTicking()
    }
    this.setState('playing')
  }

  private async playFile(voice: Voice, track: MusicTrack, bus: Bus, at: number) {
    const ctx = this.ctx!
    let pending = this.buffers.get(track.src!)
    if (!pending) {
      pending = fetch(track.src!)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((b) => ctx.decodeAudioData(b))
        .catch(() => null)
      this.buffers.set(track.src!, pending)
    }
    const buffer = await pending
    if (this.voice !== voice) return
    if (!buffer) {
      // Missing or broken file: the composed version plays instead.
      voice.composition = track.compose(bus, ctx.currentTime + 0.05)
      voice.composition.schedule(ctx.currentTime + LOOKAHEAD)
      this.startTicking()
      return
    }
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    src.connect(voice.tone)
    src.start(Math.max(at, ctx.currentTime))
    voice.file = src
  }

  private fadeOut(voice: Voice, now: number) {
    voice.out.gain.cancelScheduledValues(now)
    voice.out.gain.setValueAtTime(voice.out.gain.value, now)
    voice.out.gain.linearRampToValueAtTime(0.0001, now + CROSSFADE)
    voice.wetFade.gain.cancelScheduledValues(now)
    voice.wetFade.gain.setValueAtTime(voice.wetFade.gain.value, now)
    voice.wetFade.gain.linearRampToValueAtTime(0.0001, now + CROSSFADE)
    voice.composition?.stop(now + CROSSFADE * 0.6)
    voice.file?.stop(now + CROSSFADE + 0.1)
    // Release the nodes once the fade (and the reverb tail) has passed.
    setTimeout(() => {
      try {
        voice.out.disconnect()
        voice.tone.disconnect()
        voice.wetFade.disconnect()
      } catch {
        /* already gone */
      }
    }, (CROSSFADE + 7) * 1000)
  }

  private startTicking() {
    if (this.timer) return
    this.timer = setInterval(() => {
      try {
        if (this.ctx && this.voice?.composition) this.voice.composition.schedule(this.ctx.currentTime + LOOKAHEAD)
      } catch {
        /* a scheduling hiccup must never surface */
      }
    }, TICK_MS)
  }

  private stopTicking() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  dispose() {
    this.stopTicking()
    void this.ctx?.close()
    this.ctx = null
  }
}

/** Render a short preview of a track offline (used for QA and previews — never in the UI loop). */
export async function renderPreview(track: MusicTrack, seconds: number, sampleRate = 44100) {
  const ctx = new OfflineAudioContext(2, Math.floor(seconds * sampleRate), sampleRate)
  const master = ctx.createGain()
  master.gain.value = 0.6
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -20
  comp.ratio.value = 3
  master.connect(comp).connect(ctx.destination)
  const reverb = makeReverb(ctx)
  const ret = ctx.createGain()
  ret.gain.value = 0.55
  reverb.connect(ret).connect(master)
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 5200
  const trim = ctx.createGain()
  trim.gain.value = track.trim
  tone.connect(trim).connect(master)
  const wet = ctx.createGain()
  const wetTrim = ctx.createGain()
  wetTrim.gain.value = track.trim
  wet.connect(wetTrim).connect(reverb)
  const composition = track.compose({ ctx, dry: tone, wet }, 0.05)
  composition.schedule(seconds)
  return ctx.startRendering()
}
