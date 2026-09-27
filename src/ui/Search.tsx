import { useEffect, useMemo, useRef, useState } from 'react'
import { search } from '../graph'
import { useExplore } from '../store/explore'

/** Small, quiet, and it *navigates* — results are destinations, not a page. */
export function Search() {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [focused, setFocused] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const travelTo = useExplore((s) => s.travelTo)
  const setPreview = useExplore((s) => s.setPreview)
  const setSearchOpen = useExplore((s) => s.setSearchOpen)
  const hits = useMemo(() => search.query(q, 6), [q])
  const open = focused && q.trim().length > 0

  useEffect(() => setActive(0), [q])
  useEffect(() => setSearchOpen(focused), [focused, setSearchOpen])
  useEffect(() => {
    if (open && hits[active]) setPreview(hits[active].topic.id)
    else setPreview(null)
  }, [open, hits, active, setPreview])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault()
        input.current?.focus()
        input.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (id: string) => {
    travelTo(id, 'search')
    setQ('')
    input.current?.blur()
  }

  return (
    <div className={`search ${open ? 'is-open' : ''}`} role="search">
      <svg className="search-icon" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M12.8 12.8 L17 17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <input
        ref={input}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(hits.length - 1, a + 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(0, a - 1))
          } else if (e.key === 'Enter' && hits[active]) {
            go(hits[active].topic.id)
          } else if (e.key === 'Escape') {
            setQ('')
            input.current?.blur()
          }
        }}
        placeholder="Search the universe…"
        aria-label="Search the universe"
        role="combobox"
        aria-expanded={open}
        aria-controls="search-results"
        aria-activedescendant={open && hits[active] ? `sr-${hits[active].topic.id}` : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      <kbd className="search-kbd" aria-hidden="true">
        /
      </kbd>
      {open && (
        <ul className="search-results" id="search-results" role="listbox">
          {hits.length === 0 && <li className="search-empty">Not charted yet. Try a broader idea — every region connects to the core.</li>}
          {hits.map((h, i) => (
            <li
              key={h.topic.id}
              id={`sr-${h.topic.id}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : ''}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                go(h.topic.id)
              }}
            >
              <span className="dot" data-domain={h.topic.domain} aria-hidden="true" />
              <span className="sr-title">{h.topic.title}</span>
              <span className="sr-short">{h.topic.short}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
