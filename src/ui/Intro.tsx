import { useEffect, useState } from 'react'
import { useExplore } from '../store/explore'

/**
 * Loading is part of the experience: short real steps, then the title
 * surfaces over the igniting universe and steps aside the moment the
 * visitor starts to explore.
 */
export function Intro() {
  const phase = useExplore((s) => s.phase)
  const step = useExplore((s) => s.loadingStep)
  const [titleGone, setTitleGone] = useState(false)

  useEffect(() => {
    if (phase !== 'explore') return
    const dismiss = () => setTitleGone(true)
    const t = setTimeout(dismiss, 6500)
    window.addEventListener('pointerdown', dismiss, { once: true })
    window.addEventListener('wheel', dismiss, { once: true })
    window.addEventListener('keydown', dismiss, { once: true })
    return () => {
      clearTimeout(t)
      window.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('wheel', dismiss)
      window.removeEventListener('keydown', dismiss)
    }
  }, [phase])

  return (
    <>
      <div className={`loader ${phase === 'loading' ? '' : 'is-done'}`} aria-hidden={phase !== 'loading'}>
        <span className="loader-line" />
        <span className="loader-step" key={step}>
          {step}
        </span>
      </div>
      <div className={`title-card ${phase === 'explore' && !titleGone ? 'is-visible' : ''}`} aria-hidden={titleGone}>
        <h1>
          <span className="tc-small">The</span>
          <span className="tc-big">Universe of Knowledge</span>
        </h1>
        <p>Explore anything. Understand everything. Go as deep as you want.</p>
        <p className="tc-hint">Drag to look around · click any light to travel</p>
      </div>
    </>
  )
}
