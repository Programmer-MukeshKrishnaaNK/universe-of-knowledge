import { useEffect, useState } from 'react'
import { TRACKS, type MusicChoice } from '../audio/engine'
import { useMusic } from '../store/music'

const OPTIONS: { id: MusicChoice; title: string; mood: string }[] = [...TRACKS.map((t) => ({ id: t.id as MusicChoice, title: t.title, mood: t.mood })), { id: 'off', title: 'Off', mood: 'Silence.' }]

/** A minimal soundtrack control: three pieces and silence, a volume, a mute. */
export function MusicControl() {
  const choice = useMusic((s) => s.choice)
  const volume = useMusic((s) => s.volume)
  const muted = useMusic((s) => s.muted)
  const engine = useMusic((s) => s.engine)
  const setChoice = useMusic((s) => s.setChoice)
  const setVolume = useMusic((s) => s.setVolume)
  const setMuted = useMusic((s) => s.setMuted)
  const [open, setOpen] = useState(false)
  const current = OPTIONS.find((o) => o.id === choice) ?? OPTIONS[0]

  useEffect(() => {
    if (!open) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), setOpen(false))
    window.addEventListener('keydown', close, true)
    return () => window.removeEventListener('keydown', close, true)
  }, [open])

  const status =
    engine === 'unsupported'
      ? 'This browser cannot play the soundtrack.'
      : engine === 'blocked'
        ? 'The browser is holding the sound back — choose a track to start it.'
        : engine === 'waiting'
          ? 'Starts with your first interaction.'
          : null

  return (
    <>
      {open && (
        <div className="music-panel" role="dialog" aria-label="Soundtrack">
          <p className="quality-head">Soundtrack</p>
          <div role="radiogroup" aria-label="Soundtrack">
            {OPTIONS.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={choice === o.id} className={`quality-opt ${choice === o.id ? 'is-active' : ''}`} onClick={() => setChoice(o.id)}>
                <span className="quality-name">{o.title}</span>
                <span className="quality-blurb">{o.mood}</span>
              </button>
            ))}
          </div>
          <div className="music-volume">
            <button type="button" className="chip" aria-pressed={muted} onClick={() => setMuted(!muted)}>
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Soundtrack volume"
              disabled={choice === 'off'}
            />
          </div>
          {status && <p className="music-status">{status}</p>}
          <p className="music-note">Composed for this universe and performed live in your browser.</p>
        </div>
      )}
      <button
        type="button"
        className={`ctl ${open ? 'is-active' : ''}`}
        aria-expanded={open}
        aria-label={`Soundtrack: ${current.title}${muted && choice !== 'off' ? ', muted' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`music-glyph ${engine === 'playing' && !muted ? 'is-live' : ''}`} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        {choice === 'off' ? 'Off' : current.title}
      </button>
    </>
  )
}
