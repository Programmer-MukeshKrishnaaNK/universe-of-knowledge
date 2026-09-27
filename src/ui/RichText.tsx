import katex from 'katex'
import { Fragment, memo, type ReactNode } from 'react'
import { graph } from '../graph'
import { useExplore } from '../store/explore'

/**
 * Renders authored (and AI) text: [[topic-id|label]] become doorways into
 * the universe, $…$ and $$…$$ become typeset mathematics.
 * Unknown topic ids degrade to plain text — the AI can never invent a node.
 */

const TOKEN = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\[\[[^\]]+\]\]|\*\*[^*]+\*\*)/g

function math(src: string, display: boolean, key: number) {
  try {
    const html = katex.renderToString(src, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'html' })
    return display ? (
      <span key={key} className="math-block" dangerouslySetInnerHTML={{ __html: html }} />
    ) : (
      <span key={key} className="math-inline" dangerouslySetInnerHTML={{ __html: html }} />
    )
  } catch {
    return <code key={key}>{src}</code>
  }
}

export function TopicLink({ id, children, className = 'term' }: { id: string; children?: ReactNode; className?: string }) {
  const t = graph.get(id)
  const travelTo = useExplore((s) => s.travelTo)
  const setPreview = useExplore((s) => s.setPreview)
  if (!t) return <>{children}</>
  return (
    <button
      type="button"
      className={className}
      data-short={t.short}
      onClick={() => travelTo(id, 'link')}
      onMouseEnter={() => setPreview(id)}
      onMouseLeave={() => setPreview(null)}
      onFocus={() => setPreview(id)}
      onBlur={() => setPreview(null)}
      aria-label={`${typeof children === 'string' ? children : t.title} — travel to ${t.title}`}
    >
      {children ?? t.title}
    </button>
  )
}

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let k = 0
  for (const part of text.split(TOKEN)) {
    if (!part) continue
    if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) out.push(math(part.slice(2, -2), true, k++))
    else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) out.push(math(part.slice(1, -1), false, k++))
    else if (part.startsWith('[[')) {
      const [id, label] = part.slice(2, -2).split('|')
      const t = graph.get(id.trim())
      out.push(t ? <TopicLink key={k++} id={t.id}>{renderInline(label ?? t.title)}</TopicLink> : <Fragment key={k++}>{label ?? id}</Fragment>)
    } else if (part.startsWith('**') && part.endsWith('**')) out.push(<strong key={k++}>{part.slice(2, -2)}</strong>)
    else out.push(<Fragment key={k++}>{part}</Fragment>)
  }
  return out
}

export const RichText = memo(function RichText({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n{2,}/)
  return (
    <div className={className ?? 'rich'}>
      {paragraphs.map((p, i) => {
        const lines = p.split('\n')
        const bullets = lines.every((l) => /^\s*[-•*]\s+/.test(l)) && lines.length > 1
        if (bullets)
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^\s*[-•*]\s+/, ''))}</li>
              ))}
            </ul>
          )
        return <p key={i}>{renderInline(lines.join(' '))}</p>
      })}
    </div>
  )
})
