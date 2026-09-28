import { useEffect, useRef, useState } from 'react'
import { QUALITY, readSignals, recommend, refineWithFrameTime, type QualityChoice } from '../engine/quality'
import { useExplore } from '../store/explore'
import { resolvedMode, useSettings } from '../store/settings'

const CHOICES: QualityChoice[] = ['auto', 'low', 'medium', 'high', 'max']

/** Measure the median frame time over a short window (no data leaves the device). */
function probeFrames(ms: number): Promise<number> {
  return new Promise((resolve) => {
    const times: number[] = []
    let last = performance.now()
    const start = last
    const tick = () => {
      const now = performance.now()
      times.push(now - last)
      last = now
      if (now - start < ms) requestAnimationFrame(tick)
      else {
        times.sort((a, b) => a - b)
        resolve(times[Math.floor(times.length / 2)] ?? 16.7)
      }
    }
    requestAnimationFrame(tick)
  })
}

/**
 * Work out what Auto should mean on this device: coarse capability signals
 * first, then — once the universe is running — a short measured frame probe
 * that can only step the recommendation down.
 */
export function useQualityDetection() {
  const phase = useExplore((s) => s.phase)
  const probed = useRef(false)
  useEffect(() => {
    useSettings.getState().setRecommended(recommend(readSignals()))
  }, [])
  useEffect(() => {
    if (phase !== 'explore' || probed.current) return
    probed.current = true
    // Wait for the opening shot to settle; a hidden tab would give a meaningless probe.
    const t = setTimeout(async () => {
      if (document.visibilityState !== 'visible') return
      const median = await probeFrames(1500)
      const s = useSettings.getState()
      s.setRecommended(refineWithFrameTime(s.recommended, median))
    }, 7000)
    return () => clearTimeout(t)
  }, [phase])
}

/** The quality control and its one-time recommendation. */
export function QualityControl() {
  const quality = useSettings((s) => s.quality)
  const recommended = useSettings((s) => s.recommended)
  const acknowledged = useSettings((s) => s.acknowledged)
  const setQuality = useSettings((s) => s.setQuality)
  const acknowledge = useSettings((s) => s.acknowledge)
  const phase = useExplore((s) => s.phase)
  const [open, setOpen] = useState(false)
  const [offer, setOffer] = useState(false)
  const mode = resolvedMode({ quality, recommended })

  // Offer the recommendation once, after the opening sequence — never over it.
  useEffect(() => {
    if (acknowledged || phase !== 'explore') return
    const t = setTimeout(() => setOffer(true), 9500)
    return () => clearTimeout(t)
  }, [acknowledged, phase])

  useEffect(() => {
    if (!open) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), setOpen(false))
    window.addEventListener('keydown', close, true)
    return () => window.removeEventListener('keydown', close, true)
  }, [open])

  return (
    <>
      {offer && !acknowledged && !open && (
        <div className="quality-offer" role="status">
          <p>
            Recommended experience: <b>{QUALITY[recommended].label}</b>
          </p>
          <div>
            <button
              type="button"
              className="chip"
              onClick={() => {
                acknowledge()
                setOffer(false)
              }}
            >
              Use {QUALITY[recommended].label}
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => {
                acknowledge()
                setOffer(false)
                setOpen(true)
              }}
            >
              Customize
            </button>
          </div>
        </div>
      )}
      {open && (
        <div className="quality-panel" role="dialog" aria-label="Visual quality">
          <p className="quality-head">Visual quality</p>
          <div role="radiogroup" aria-label="Visual quality">
            {CHOICES.map((c) => {
              const label = c === 'auto' ? `Auto · ${QUALITY[recommended].label}` : QUALITY[c].label
              const blurb = c === 'auto' ? 'Chosen for this device. Adjusts if the universe struggles.' : QUALITY[c].blurb
              return (
                <button key={c} type="button" role="radio" aria-checked={quality === c} className={`quality-opt ${quality === c ? 'is-active' : ''}`} onClick={() => setQuality(c)}>
                  <span className="quality-name">
                    {label}
                    {c === recommended && <span className="quality-rec">recommended</span>}
                  </span>
                  <span className="quality-blurb">{blurb}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      <button type="button" className={`ctl ${open ? 'is-active' : ''}`} aria-expanded={open} aria-label={`Visual quality: ${quality === 'auto' ? 'Auto, ' : ''}${QUALITY[mode].label}`} onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
          <circle cx="8" cy="8" r="2.2" fill="currentColor" />
          <circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2.2 2" />
        </svg>
        {quality === 'auto' ? 'Auto' : QUALITY[mode].label}
      </button>
    </>
  )
}
