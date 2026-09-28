import type { Topic } from '../data/schema'

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9=²ψ\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const STOP = new Set(['that', 'this', 'with', 'from', 'into', 'what', 'when', 'where', 'which', 'their', 'there', 'about', 'thing', 'things', 'every', 'each', 'more', 'most', 'than', 'they', 'them', 'have', 'been', 'also', 'only', 'same', 'your'])

const singular = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)
const words = (s: string) => s.split(/[\s-]+/).filter(Boolean).map(singular)

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

const trigramsOf = (w: string) => {
  const s = `  ${w} `
  const out: string[] = []
  for (let i = 0; i < s.length - 2; i++) out.push(s.slice(i, i + 3))
  return out
}

interface Entry {
  title: string
  names: string[]
  namesSingular: string[]
  words: string[]
  tags: string[]
  short: string
}

export interface SearchHit {
  topic: Topic
  index: number
  score: number
}

/**
 * Scalable, typo-tolerant search.
 *
 *  token → topics          exact / prefix matches (binary search over sorted tokens)
 *  trigram → tokens        typo tolerance without comparing against every word
 *
 * Only candidates are scored, so a keystroke never scans the whole universe.
 * Topics can be added region by region as they load.
 */
export class SearchIndex {
  private topics: Topic[] = []
  private entries: Entry[] = []
  private importance: number[] = []
  private tokenTopics = new Map<string, number[]>()
  private trigramTokens = new Map<string, string[]>()
  private sorted: string[] = []
  private dirty = false

  add(list: Topic[], indices: number[], importance?: (i: number) => number) {
    list.forEach((t, k) => {
      const i = indices[k]
      const title = normalize(t.title)
      const names = [title, ...(t.aliases ?? []).map(normalize)]
      const entry: Entry = {
        title,
        names,
        namesSingular: names.map((n) => words(n).join(' ')),
        words: [...new Set(names.flatMap(words))],
        tags: (t.tags ?? []).map(normalize),
        short: normalize(t.short),
      }
      this.topics[i] = t
      this.entries[i] = entry
      this.importance[i] = importance?.(i) ?? 0
      // Short descriptions contribute meaningful words (weakly scored) so "chance" still finds Probability.
      const shortWords = words(entry.short).filter((w) => w.length > 3 && !STOP.has(w))
      const tokens = new Set([...entry.words, ...entry.tags.flatMap(words), ...shortWords])
      for (const tok of tokens) {
        const list = this.tokenTopics.get(tok)
        if (list) list.push(i)
        else {
          this.tokenTopics.set(tok, [i])
          for (const g of trigramsOf(tok)) {
            const l = this.trigramTokens.get(g)
            if (l) l.push(tok)
            else this.trigramTokens.set(g, [tok])
          }
        }
      }
    })
    this.dirty = true
  }

  get size() {
    return this.entries.filter(Boolean).length
  }

  private tokensWithPrefix(prefix: string, cap = 300) {
    if (this.dirty) {
      this.sorted = [...this.tokenTopics.keys()].sort()
      this.dirty = false
    }
    let lo = 0, hi = this.sorted.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (this.sorted[mid] < prefix) lo = mid + 1
      else hi = mid
    }
    const out: string[] = []
    for (let i = lo; i < this.sorted.length && out.length < cap && this.sorted[i].startsWith(prefix); i++) out.push(this.sorted[i])
    return out
  }

  private fuzzyTokens(w: string) {
    const max = w.length > 6 ? 2 : 1
    const counts = new Map<string, number>()
    const grams = trigramsOf(w)
    for (const g of grams) for (const tok of this.trigramTokens.get(g) ?? []) counts.set(tok, (counts.get(tok) ?? 0) + 1)
    const out: string[] = []
    for (const [tok, c] of counts) if (c >= Math.max(1, grams.length * 0.35) && editDistance(tok, w, max) <= max) out.push(tok)
    return out
  }

  query(raw: string, limit = 6, opts: { domain?: string } = {}): SearchHit[] {
    const q = normalize(raw)
    if (!q) return []
    const qs = words(q).join(' ')
    const qWords = words(q)

    // ── Candidates ──
    const candidates = new Set<number>()
    const add = (tok: string) => {
      for (const i of this.tokenTopics.get(tok) ?? []) {
        candidates.add(i)
        if (candidates.size > 6000) return
      }
    }
    for (const w of qWords) for (const tok of this.tokensWithPrefix(w)) add(tok)
    if (candidates.size < limit * 3) for (const w of qWords) if (w.length > 3) for (const tok of this.fuzzyTokens(w)) add(tok)

    // ── Scoring ──
    const hits: SearchHit[] = []
    for (const i of candidates) {
      const e = this.entries[i]
      const t = this.topics[i]
      if (opts.domain && t.domain !== opts.domain) continue
      let s = 0
      e.names.forEach((name, k) => {
        const ns = e.namesSingular[k]
        if (name === q || ns === qs) s = Math.max(s, name === e.title ? 100 : 94)
        else if (name.startsWith(q) || ns.startsWith(qs)) s = Math.max(s, 80 - Math.min(10, name.length - q.length) * 0.5)
        else if (name.includes(q) || ns.includes(qs)) s = Math.max(s, 58)
      })
      if (s < 58) {
        let matched = 0
        for (const w of qWords) {
          if (e.words.some((x) => x.startsWith(w))) matched += 1
          else if (w.length > 3 && e.words.some((x) => editDistance(x, w, w.length > 6 ? 2 : 1) <= (w.length > 6 ? 2 : 1))) matched += 0.75
        }
        if (matched) s = Math.max(s, 40 + (matched / qWords.length) * 25)
      }
      if (s < 40 && e.tags.some((tag) => tag.includes(q))) s = 32
      if (s < 30 && q.length > 3 && e.short.includes(q)) s = 18
      if (s <= 0) continue
      // Broader and better-connected ideas win ties.
      s += (3 - t.level) * 0.4 + (t.mapped === false ? -2 : 0) + Math.min(1.5, this.importance[i] * 0.05)
      hits.push({ topic: t, index: i, score: s })
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, limit)
  }
}
