import { useEffect, useRef, useState } from 'react'
import { levelName } from '../data'
import { graph } from '../graph'
import { useExplore } from '../store/explore'
import { useKnowledge } from '../store/knowledge'
import { hud } from './hud'
import { OutlineTree } from './Fallback'
import { QualityControl } from './Quality'

/** Top-left wordmark — also the way home. */
export function Wordmark() {
  const home = useExplore((s) => s.home)
  const focusId = useExplore((s) => s.focusId)
  return (
    <button type="button" className={`wordmark ${focusId ? '' : 'is-home'}`} onClick={home} aria-label="The Universe of Knowledge — return to overview">
      <span className="wm-mark" aria-hidden="true" />
      <span className="wm-text">The Universe of Knowledge</span>
    </button>
  )
}

/** Bottom-left: the journey so far. */
export function Journey() {
  const trail = useExplore((s) => s.trail)
  const focusId = useExplore((s) => s.focusId)
  const back = useExplore((s) => s.back)
  const travelTo = useExplore((s) => s.travelTo)
  if (!focusId) return null
  const recent = trail.slice(-4)
  return (
    <nav className="journey" aria-label="Your journey">
      <button type="button" className="journey-back" onClick={back} aria-label="Go back">
        <span aria-hidden="true">←</span> <kbd>Esc</kbd>
      </button>
      <ol>
        {trail.length > recent.length && <li className="journey-more">…</li>}
        {recent.map((id) => (
          <li key={id}>
            <button type="button" onClick={() => travelTo(id, 'link')}>
              {graph.get(id)?.title}
            </button>
          </li>
        ))}
        <li aria-current="location" className="journey-here">
          {graph.get(focusId)?.title}
        </li>
      </ol>
    </nav>
  )
}

/** Hover tooltip — positioned per frame by the scene driver. */
export function HoverTip() {
  const ref = useRef<HTMLDivElement>(null)
  const hoverId = useExplore((s) => s.hoverId)
  const previewId = useExplore((s) => s.previewId)
  const focusId = useExplore((s) => s.focusId)
  const id = hoverId ?? previewId
  const t = graph.get(id)
  useEffect(() => {
    hud.tip = ref.current
    return () => {
      hud.tip = null
    }
  }, [])
  return (
    <div ref={ref} className="hover-tip" data-visible="false" aria-hidden="true">
      {t && id !== focusId && (
        <div className="hover-tip-inner">
          <span className="ht-meta">
            <span className="dot" data-domain={t.domain} />
            {levelName[t.level]}
            {t.mapped === false ? ' · uncharted' : ''}
          </span>
          <span className="ht-title">{t.title}</span>
          <span className="ht-short">{t.short}</span>
        </div>
      )}
    </div>
  )
}

/** Bottom-right: the personal layer, overview, and help. */
export function Controls() {
  const showMap = useExplore((s) => s.showMap)
  const toggleMap = useExplore((s) => s.toggleMap)
  const home = useExplore((s) => s.home)
  const focusId = useExplore((s) => s.focusId)
  const understood = useKnowledge((s) => Object.values(s.entries).filter((e) => e.state === 'understood').length)
  const [help, setHelp] = useState(false)
  const [outline, setOutline] = useState(false)
  useEffect(() => {
    if (!outline) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), setOutline(false))
    window.addEventListener('keydown', close, true)
    return () => window.removeEventListener('keydown', close, true)
  }, [outline])
  return (
    <div className={`controls ${focusId ? 'with-panel' : ''}`}>
      {outline && (
        <nav className="outline" aria-label="Outline of the universe">
          <div className="outline-head">
            <span>Outline</span>
            <button type="button" onClick={() => setOutline(false)} aria-label="Close outline">
              ×
            </button>
          </div>
          <div className="outline-body fallback-tree">
            <OutlineTree onPick={() => setOutline(false)} />
          </div>
        </nav>
      )}
      {showMap && !help && (
        <p className="map-key" role="status">
          {understood ? 'Warm rings: what you understand · half rings: learning · warm threads: paths you’ve travelled' : 'Mark topics as understood and your map will light up here.'}
        </p>
      )}
      {help && (
        <div className="help" role="dialog" aria-label="How to explore">
          <p><b>Drag</b> to orbit · <b>Right-drag</b> or <b>Shift-drag</b> to pan · <b>Scroll</b> or pinch to zoom</p>
          <p><b>Click</b> a point of light to travel there</p>
          <p><kbd>/</kbd> search · <kbd>Esc</kbd> back · <kbd>←</kbd><kbd>→</kbd> look around · <kbd>Enter</kbd> travel · <kbd>H</kbd> overview · <kbd>M</kbd> your map</p>
        </div>
      )}
      <QualityControl />
      <button type="button" className={`ctl ${outline ? 'is-active' : ''}`} aria-expanded={outline} onClick={() => setOutline((o) => !o)} title="Browse every topic as a list">
        Outline
      </button>
      <button type="button" className={`ctl ${showMap ? 'is-active' : ''}`} aria-pressed={showMap} onClick={toggleMap} title="Show what you know">
        Your map{understood ? <span className="ctl-count">{understood}</span> : null}
      </button>
      {focusId && (
        <button type="button" className="ctl" onClick={home}>
          Overview
        </button>
      )}
      <button type="button" className={`ctl ctl-round ${help ? 'is-active' : ''}`} aria-expanded={help} onClick={() => setHelp((h) => !h)} aria-label="How to explore">
        ?
      </button>
    </div>
  )
}

export function LiveRegion() {
  const announce = useExplore((s) => s.announce)
  return (
    <div className="sr-only" aria-live="polite" role="status">
      {announce}
    </div>
  )
}

/**
 * Keyboard exploration: ←/→ look around the current neighbourhood,
 * Enter travels, Esc goes back, H returns to the overview, M toggles your map.
 */
export function useKeyboardNavigation() {
  useEffect(() => {
    let cursor = -1
    let arrowPreview = false // Esc dismisses a preview only if the arrow keys made it
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return
      const s = useExplore.getState()
      const pool = s.focusId
        ? graph.neighbors(graph.idx(s.focusId)).map((i) => graph.topics[i].id)
        : graph.topics.filter((x) => x.level === 0).map((x) => x.id)
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (!pool.length) return
        e.preventDefault()
        const current = s.previewId ? pool.indexOf(s.previewId) : cursor
        cursor = (current + (e.key === 'ArrowRight' ? 1 : pool.length - 1) + (current < 0 && e.key === 'ArrowLeft' ? 1 : 0)) % pool.length
        s.setPreview(pool[cursor])
        arrowPreview = true
        const p = graph.get(pool[cursor])
        if (p) s.say(`${p.title}. ${p.short} Press Enter to travel.`)
      } else if (e.key === 'Enter' && s.previewId && t.tagName !== 'BUTTON' && t.tagName !== 'A') {
        e.preventDefault()
        s.travelTo(s.previewId, 'keyboard')
        cursor = -1
        arrowPreview = false
      } else if (e.key === 'Escape') {
        if (arrowPreview && s.previewId) s.setPreview(null)
        else s.back()
        arrowPreview = false
        cursor = -1
      } else if (e.key === 'h' || e.key === 'H') s.home()
      else if (e.key === 'm' || e.key === 'M') s.toggleMap()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

const DEPTHS = ['Domain', 'Field', 'Concept', 'Deep concept', 'Frontier']

/**
 * An altimeter for knowledge: how deep into a region you have travelled.
 * Research-level topics sit at the frontier.
 */
export function DepthMeter() {
  const focusId = useExplore((s) => s.focusId)
  const t = graph.get(focusId)
  if (!t) return null
  const depth = t.difficulty === 'research' ? 4 : t.level
  return (
    <div className="depth-meter" aria-label={`Depth: ${DEPTHS[depth]}`} role="img">
      <span className="dm-rail" aria-hidden="true">
        <span className="dm-marker" style={{ top: `${(depth / (DEPTHS.length - 1)) * 100}%` }} />
      </span>
      <ol aria-hidden="true">
        {DEPTHS.map((d, i) => (
          <li key={d} className={i === depth ? 'is-here' : i < depth ? 'is-above' : ''}>
            {d}
          </li>
        ))}
      </ol>
    </div>
  )
}
