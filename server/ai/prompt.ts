import type { Paper, Topic } from '../../src/data/schema'
import type { KnowledgeGraph } from '../../src/knowledge/graph'
import { advise, stepBack } from '../../src/graph/recommend'
import { GuideKnowledge } from '../../src/knowledge/guide'
import type { ChatMessage } from './providers'

export type Mode = 'simple' | 'analogy' | 'math' | 'eli15' | 'deeper' | 'confused' | 'question' | 'next' | 'paper'

const MODE_INSTRUCTIONS: Record<Mode, string> = {
  simple: 'Explain this topic as simply as possible, for someone with no background. Start from an everyday intuition. About 120–170 words.',
  analogy: 'Give one vivid, accurate analogy for this topic, then say briefly where the analogy breaks down. About 120–170 words.',
  math: 'Explain the mathematics behind this topic step by step. Introduce each symbol in words before using it. Use $…$ and $$…$$. About 180–280 words.',
  eli15: 'Explain this to a curious 15-year-old: concrete, friendly, no jargon without a definition. About 140–190 words.',
  deeper: 'Take the learner one level deeper than the topic card: the mechanism, a subtlety experts care about, and what to explore next. About 200–300 words.',
  confused:
    'The learner said they don’t understand this. Be warm and reassuring (never imply they should already know it). Start with "Let’s take one step back." Rebuild the idea from the most basic intuition, in small steps, and name which single prerequisite would help most. About 150–220 words.',
  question: 'Answer the learner’s question about this topic directly and clearly. If the question is outside the topic, answer briefly and connect it back. Up to about 220 words.',
  next: 'Recommend what this learner should explore next. Use ONLY the RECOMMENDED NEXT and WORTH DISCOVERING lists (from the knowledge graph) — explain in a sentence or two why each of the top two or three follows naturally from this topic and from what they already know. If a BRIDGE fits, you may end with one surprising connection into another field. Link each with [[id|title]]. About 120–170 words.',
  paper: 'Explain the RESEARCH PAPER below to this learner: what question it asked, what it found or proposed, and why it mattered, in plain language at their depth. Use only the paper details given plus standard textbook knowledge; if the learner would need details beyond them, say so and suggest reading the source. About 150–220 words.',
}

function topicCard(t: Topic, depth: string) {
  const parts = [
    `TITLE: ${t.title}`,
    `ONE LINE: ${t.short}`,
    `WHAT IT IS: ${t.simple}`,
    t.intuition && `INTUITION: ${t.intuition}`,
    t.analogy && `ANALOGY: ${t.analogy}`,
    t.howItWorks && `HOW IT WORKS: ${t.howItWorks}`,
    (depth === 'technical' || depth === 'detailed') && t.technical && `TECHNICAL: ${t.technical}`,
    t.math && `MATHEMATICS: ${t.math}`,
    t.why && `WHY IT MATTERS: ${t.why}`,
    t.misconceptions?.length && `MISCONCEPTIONS: ${t.misconceptions.map((m) => `${m.myth} → ${m.truth}`).join(' | ')}`,
  ]
  return parts.filter(Boolean).join('\n')
}

export function buildMessages(
  graph: KnowledgeGraph,
  topic: Topic,
  mode: Mode,
  opts: { question?: string; depth: string; known: string[]; history: ChatMessage[]; paper?: Paper },
): ChatMessage[] {
  const neighborhood = new Map<string, string>()
  const add = (x?: Topic) => x && neighborhood.set(x.id, x.title)
  add(topic)
  graph.prerequisites(topic.id).forEach(add)
  graph.related(topic.id).forEach(add)
  graph.deeper(topic.id).forEach(add)
  graph.lineage(topic.id).forEach(add)
  for (const p of graph.prerequisites(topic.id)) graph.prerequisites(p.id).forEach(add)
  // Read-only view for the guide: it may consult routes, bridges and discoveries, never change them.
  const kg = new GuideKnowledge(graph)
  const discoveries = mode === 'next' ? kg.discoveries(topic.id, opts.known) : []
  const bridges = mode === 'next' ? kg.bridges(topic.id, 4) : []
  for (const d of discoveries) neighborhood.set(d.id, d.title)
  for (const b of bridges) for (const x of [b.from, b.to]) neighborhood.set(x.id, x.title)

  const knownTitles = opts.known.map((id) => graph.get(id)?.title).filter(Boolean).slice(0, 30)

  const system = [
    'You are the Guide inside "The Universe of Knowledge", an explorable map of mathematics and science.',
    'Your job is to make ideas genuinely understandable to anyone. Principles:',
    '- Never make the learner feel stupid. Be warm, curious and encouraging; never condescending.',
    '- Intuition first, precision second. Define any technical term in plain words the first time.',
    '- Be scientifically accurate. The TOPIC CARD is curated and is your source of truth; you may add standard textbook knowledge but never contradict it.',
    '- If something is uncertain or debated, say so plainly.',
    '- Never invent papers, authors, dates, statistics or quotations.',
    '- Format: short paragraphs, no headings, no tables. Use $…$ for inline math and $$…$$ for display math. You may use "- " bullet lines sparingly.',
    '- When you mention a concept from CONNECTED TOPICS, link it exactly as [[id|words]] using the given id. Never link any id not in that list.',
    '',
    'TOPIC CARD',
    topicCard(topic, opts.depth),
    '',
    'CONNECTED TOPICS (id — title)',
    [...neighborhood].map(([id, title]) => `${id} — ${title}`).join('\n'),
    '',
    `LEARNER: prefers the "${opts.depth}" depth.${knownTitles.length ? ` Already understands: ${knownTitles.join(', ')}.` : ' No recorded background yet — assume none.'}`,
    ...(mode === 'next'
      ? [
          '',
          'RECOMMENDED NEXT (from the knowledge graph, best first)',
          recommendedNext(graph, topic, opts.known),
          '',
          'WORTH DISCOVERING (id — title: why the graph suggests it)',
          discoveries.map((d) => `${d.id} — ${d.title}: ${d.reason}`).join('\n') || '(none)',
          '',
          'BRIDGES INTO OTHER FIELDS (from — to, relationship)',
          bridges.map((b) => `${b.from.id} — ${b.to.id} (${b.type})`).join('\n') || '(none)',
        ]
      : []),
    ...(mode === 'paper' && opts.paper ? ['', 'RESEARCH PAPER', paperCard(opts.paper)] : []),
  ].join('\n')

  const ask = mode === 'question' && opts.question ? `${MODE_INSTRUCTIONS.question}\n\nQuestion: ${opts.question}` : MODE_INSTRUCTIONS[mode]
  return [{ role: 'system', content: system }, ...opts.history.slice(-4), { role: 'user', content: `Topic: ${topic.title}\n\n${ask}` }]
}

function recommendedNext(graph: KnowledgeGraph, topic: Topic, known: string[]) {
  const a = advise(graph, topic.id, (id) => (known.includes(id) ? 'understood' : undefined))
  const list = a.next.slice(0, 5).map((t) => `${t.id} — ${t.title}: ${t.short}`)
  if (!a.ready && a.stepBack) list.unshift(`${a.stepBack.id} — ${a.stepBack.title} (a gentle step back first): ${a.stepBack.short}`)
  return list.join('\n') || '(nothing deeper is charted yet — suggest related topics instead)'
}

function paperCard(p: Paper) {
  return [`TITLE: ${p.title}`, `AUTHORS: ${p.authors}`, `YEAR: ${p.year}`, `PUBLISHED IN: ${p.publication}`, `SUMMARY: ${p.summary}`, `WHY IT MATTERS: ${p.whyItMatters}`, `BACKGROUND NEEDED: ${p.background}`].join('\n')
}

/** Graph-grounded answers when no live model is configured. */
export function composeOffline(graph: KnowledgeGraph, topic: Topic, mode: Mode, known: string[] = [], paper?: Paper): string {
  const link = (t: Topic) => `[[${t.id}|${t.title}]]`
  const pre = graph.prerequisites(topic.id)
  const deeper = graph.deeper(topic.id).slice(0, 4)
  switch (mode) {
    case 'simple':
      return `${topic.simple}\n\n${topic.intuition ?? ''}`.trim()
    case 'analogy':
      return topic.analogy
        ? `${topic.analogy}\n\nEvery analogy bends somewhere — use it as a handrail, not a definition. ${topic.intuition ?? ''}`.trim()
        : `${topic.intuition ?? topic.simple}`
    case 'eli15':
      return `${topic.intuition ?? topic.simple}\n\n${topic.why ? `Why should you care? ${topic.why}` : ''}`.trim()
    case 'math':
      return topic.math
        ? `${topic.math}\n\n${topic.howItWorks ?? ''}`.trim()
        : `This idea is mostly conceptual rather than mathematical at this level. ${topic.howItWorks ?? topic.simple}`
    case 'deeper':
      return [topic.technical ?? topic.howItWorks ?? topic.simple, deeper.length ? `Where to go next: ${deeper.map(link).join(', ')}.` : ''].filter(Boolean).join('\n\n')
    case 'confused': {
      const first = stepBack(graph, topic.id, (id) => (known.includes(id) ? 'understood' : undefined))
      return [
        'Let’s take one step back — this one trips up almost everyone at first.',
        topic.intuition ?? topic.simple,
        topic.analogy ? `Try picturing it this way: ${topic.analogy}` : '',
        first ? `If it still feels slippery, ${link(first)} is the stepping stone that makes the rest click.` : '',
      ]
        .filter(Boolean)
        .join('\n\n')
    }
    case 'next': {
      const a = advise(graph, topic.id, (id) => (known.includes(id) ? 'understood' : undefined))
      const next = a.next.slice(0, 3)
      const lines = []
      if (!a.ready && a.stepBack) lines.push(`Before going further, ${link(a.stepBack)} will make this click — ${a.stepBack.short.charAt(0).toLowerCase() + a.stepBack.short.slice(1)}`)
      if (next.length) lines.push(`From here, the natural next steps are:\n${next.map((t) => `- ${link(t)} — ${t.short}`).join('\n')}`)
      else lines.push('Nothing deeper is charted from here yet — try the related ideas beside it.')
      return lines.join('\n\n')
    }
    case 'paper':
      return paper
        ? [`${paper.authors} (${paper.year}), in ${paper.publication}.`, paper.summary, `Why it matters: ${paper.whyItMatters}`, 'For the full argument and data, the original source is linked below the paper.'].join('\n\n')
        : 'That paper isn’t in the map.'
    case 'question':
    default:
      return [
        'The live guide isn’t connected right now, so here is what the map itself says.',
        topic.simple,
        topic.why ?? '',
        pre.length ? `It builds on ${pre.map(link).join(', ')}.` : '',
      ]
        .filter(Boolean)
        .join('\n\n')
  }
}
