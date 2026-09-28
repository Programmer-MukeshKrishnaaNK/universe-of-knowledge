import type { Paper, Topic } from '../data/schema'
import { RELATIONS } from './relations'
import { normalize } from './search'

/**
 * Dataset validation — the gate every concept passes before it can become
 * part of the universe. Used by `npm run check:data` for the curated data
 * and by `npm run ingest` for imported datasets.
 */

export type Severity = 'error' | 'warning'

export interface Issue {
  severity: Severity
  code:
    | 'duplicate-id'
    | 'missing-reference'
    | 'invalid-domain'
    | 'invalid-level'
    | 'invalid-relation'
    | 'self-relation'
    | 'prerequisite-cycle'
    | 'prerequisite-descendant'
    | 'orphan'
    | 'isolated'
    | 'duplicate-relationship'
    | 'possible-duplicate'
    | 'malformed'
    | 'missing-provenance'
    | 'unknown-paper'
    | 'broken-link'
    | 'math'
  id: string
  message: string
}

export const DOMAINS = new Set(['mathematics', 'physics', 'astronomy', 'computer-science', 'chemistry', 'biology', 'earth-science', 'neuroscience', 'engineering'])
const DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced', 'research'])
const TEXT_FIELDS = ['simple', 'intuition', 'analogy', 'howItWorks', 'technical', 'math', 'why'] as const

export interface ValidateOptions {
  /** Ids that exist outside this dataset (e.g. the curated universe when importing). */
  externalIds?: Set<string>
  /** Titles/aliases already in the universe, for duplicate detection. */
  existingNames?: Map<string, string>
  papers?: Record<string, Paper>
  /** Imported data must say where it came from; curated data is attributed by the project. */
  requireProvenance?: boolean
}

export function validateTopics(topics: Topic[], opts: ValidateOptions = {}): Issue[] {
  const issues: Issue[] = []
  const add = (severity: Severity, code: Issue['code'], id: string, message: string) => issues.push({ severity, code, id, message })
  const byId = new Map<string, Topic>()

  for (const t of topics) {
    if (!t || typeof t.id !== 'string' || !t.id.trim()) {
      add('error', 'malformed', String(t?.id), 'topic without a valid id')
      continue
    }
    // The first definition wins; later duplicates are reported, never silently merged.
    if (byId.has(t.id)) add('error', 'duplicate-id', t.id, `duplicate id "${t.id}"`)
    else byId.set(t.id, t)
  }
  const exists = (id: string) => byId.has(id) || (opts.externalIds?.has(id) ?? false)
  const levelOf = (id: string) => byId.get(id)?.level

  for (const t of byId.values()) {
    // ── Shape ──
    if (typeof t.title !== 'string' || !t.title.trim()) add('error', 'malformed', t.id, 'missing title')
    if (typeof t.short !== 'string' || !t.short.trim()) add('error', 'malformed', t.id, 'missing short description')
    if (typeof t.simple !== 'string' || !t.simple.trim()) add('error', 'malformed', t.id, 'missing simple explanation')
    if (!DIFFICULTIES.has(t.difficulty)) add('error', 'malformed', t.id, `invalid difficulty "${t.difficulty}"`)
    if (![0, 1, 2, 3].includes(t.level)) add('error', 'invalid-level', t.id, `invalid level ${t.level}`)
    if (!DOMAINS.has(t.domain)) add('error', 'invalid-domain', t.id, `unknown domain "${t.domain}"`)
    if (opts.requireProvenance && !t.provenance?.source) add('warning', 'missing-provenance', t.id, 'no provenance recorded')

    // ── Hierarchy ──
    if (t.level > 0 && !t.parent) add('error', 'orphan', t.id, 'concept has no parent in the hierarchy')
    if (t.parent) {
      if (!exists(t.parent)) add('error', 'missing-reference', t.id, `parent → unknown "${t.parent}"`)
      else {
        const pl = levelOf(t.parent)
        if (pl !== undefined && pl !== t.level - 1) add('error', 'invalid-level', t.id, `level ${t.level} but parent "${t.parent}" is level ${pl}`)
      }
    }

    // ── References ──
    const refs: [string, string][] = [
      ...(t.prerequisites ?? []).map((r) => ['prerequisite', r] as [string, string]),
      ...(t.related ?? []).map((r) => ['related', r] as [string, string]),
      ...(t.deeper ?? []).map((r) => ['deeper', r] as [string, string]),
      ...(t.relations ?? []).map((r) => [r.type, r.target] as [string, string]),
    ]
    const seenPairs = new Set<string>()
    for (const [kind, target] of refs) {
      if (target === t.id) add('error', 'self-relation', t.id, `${kind} points to itself`)
      else if (!exists(target)) add('error', 'missing-reference', t.id, `${kind} → unknown "${target}"`)
      const key = `${kind}|${target}`
      if (seenPairs.has(key)) add('warning', 'duplicate-relationship', t.id, `${kind} → "${target}" listed twice`)
      seenPairs.add(key)
    }
    for (const r of t.relations ?? []) {
      // Data arrives as untyped JSON: check the type against the registry at runtime.
      const type = r.type as string
      if (!(type in RELATIONS) || type === 'contains' || type === 'bridge') add('error', 'invalid-relation', t.id, `invalid relation type "${type}"`)
    }
    if (t.level > 0 && !refs.length && !(topics.some((o) => o.parent === t.id))) add('warning', 'isolated', t.id, 'concept connects to nothing beyond its parent')

    // ── Content ──
    for (const f of TEXT_FIELDS) {
      const text = t[f]
      if (!text) continue
      for (const m of text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) if (!exists(m[1])) add('error', 'broken-link', t.id, `link in ${f} → unknown "${m[1]}"`)
      if ((text.replace(/\$\$/g, '').match(/\$/g) ?? []).length % 2) add('error', 'math', t.id, `unbalanced $ in ${f}`)
    }
    if (opts.papers) for (const r of t.research ?? []) if (!opts.papers[r.paper]) add('error', 'unknown-paper', t.id, `unknown paper "${r.paper}"`)
  }

  // ── Prerequisite cycles (a concept can never, transitively, be its own prerequisite) ──
  const state = new Map<string, 1 | 2>()
  const stack: string[] = []
  const visit = (id: string) => {
    state.set(id, 1)
    stack.push(id)
    for (const p of byId.get(id)?.prerequisites ?? []) {
      if (!byId.has(p)) continue
      const s = state.get(p)
      if (s === 1) add('error', 'prerequisite-cycle', id, `prerequisite cycle: ${[...stack.slice(stack.indexOf(p)), p].join(' → ')}`)
      else if (s === undefined) visit(p)
    }
    stack.pop()
    state.set(id, 2)
  }
  for (const id of byId.keys()) if (!state.has(id)) visit(id)

  // A prerequisite that lives *inside* the concept (its own descendant) is almost always an authoring slip.
  for (const t of byId.values()) {
    for (const p of t.prerequisites ?? []) {
      let cur = byId.get(p)
      for (let guard = 0; cur && guard < 8; guard++) {
        if (cur.parent === t.id) {
          add('warning', 'prerequisite-descendant', t.id, `prerequisite "${p}" is inside "${t.id}" itself`)
          break
        }
        cur = cur.parent ? byId.get(cur.parent) : undefined
      }
    }
  }

  // ── Possible duplicates: the same name used by different concepts ──
  const names = new Map<string, string>(opts.existingNames ?? [])
  for (const t of byId.values()) {
    for (const n of [t.title, ...(t.aliases ?? [])].map(normalize)) {
      const other = names.get(n)
      if (other && other !== t.id) add('warning', 'possible-duplicate', t.id, `name "${n}" is also used by "${other}"`)
      else names.set(n, t.id)
    }
  }
  return issues
}

/** Stable 32-bit FNV-1a content hash — identifies exactly which knowledge produced an experience. */
export function contentHash(value: unknown): string {
  const json = canonicalJson(value)
  let h = 2166136261
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`
  if (v && typeof v === 'object')
    return `{${Object.keys(v as object)
      .sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((v as Record<string, unknown>)[k])}`)
      .join(',')}}`
  return JSON.stringify(v)
}
