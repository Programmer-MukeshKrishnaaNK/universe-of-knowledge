import type { Topic } from '../data/schema'

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9=²ψ\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const singular = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)

function editDistance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    let best = row[0]
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
      best = Math.min(best, row[j])
    }
    if (best > max) return max + 1
  }
  return row[b.length]
}

interface Entry {
  topic: Topic
  title: string
  names: string[]
  words: string[]
  tags: string[]
  short: string
}

export interface SearchHit {
  topic: Topic
  score: number
}

/** Tiny ranked, typo-tolerant search. Swap for a server index at scale. */
export class TopicSearch {
  private entries: Entry[]
  constructor(topics: Topic[]) {
    this.entries = topics.map((t) => {
      const title = norm(t.title)
      const names = [title, ...(t.aliases ?? []).map(norm)]
      return {
        topic: t,
        title,
        names,
        words: [...new Set(names.flatMap((n) => n.split(/[\s-]+/)).map(singular))],
        tags: (t.tags ?? []).map(norm),
        short: norm(t.short),
      }
    })
  }

  query(raw: string, limit = 6): SearchHit[] {
    const q = norm(raw)
    if (!q) return []
    const qs = q.split(' ').map(singular).join(' ')
    const qWords = qs.split(' ')
    const hits: SearchHit[] = []
    for (const e of this.entries) {
      let s = 0
      for (const name of e.names) {
        const ns = name.split(' ').map(singular).join(' ')
        if (name === q || ns === qs) s = Math.max(s, name === e.title ? 100 : 94)
        else if (name.startsWith(q) || ns.startsWith(qs)) s = Math.max(s, 80 - Math.min(10, name.length - q.length) * 0.5)
        else if (name.includes(q) || ns.includes(qs)) s = Math.max(s, 58)
      }
      if (s < 58) {
        let matched = 0
        for (const w of qWords) {
          if (e.words.some((x) => x.startsWith(w))) matched += 1
          else if (w.length > 3 && e.words.some((x) => editDistance(x, w, w.length > 6 ? 2 : 1) <= (w.length > 6 ? 2 : 1))) matched += 0.75
        }
        if (matched) s = Math.max(s, 40 + (matched / qWords.length) * 25)
      }
      if (s < 40 && e.tags.some((t) => t.includes(q))) s = 32
      if (s < 30 && q.length > 3 && e.short.includes(q)) s = 18
      if (s > 0) {
        // Gentle preference for broader topics on ties.
        s += (3 - e.topic.level) * 0.4 + (e.topic.mapped === false ? -2 : 0)
        hits.push({ topic: e.topic, score: s })
      }
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, limit)
  }
}
