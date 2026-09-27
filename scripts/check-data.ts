/**
 * Validates the knowledge dataset: every reference resolves, every paper
 * exists, and rich-text links point at real topics. Run: npm run check:data
 */
import { allTopics, papers } from '../src/data'

const ids = new Set(allTopics.map((t) => t.id))
const problems: string[] = []
const dup = allTopics.map((t) => t.id).filter((id, i, a) => a.indexOf(id) !== i)
if (dup.length) problems.push(`duplicate ids: ${dup.join(', ')}`)

const textFields = ['simple', 'intuition', 'analogy', 'howItWorks', 'technical', 'math', 'why'] as const
for (const t of allTopics) {
  const check = (kind: string, id?: string) => {
    if (id && !ids.has(id)) problems.push(`${t.id}: ${kind} → unknown topic "${id}"`)
  }
  check('parent', t.parent)
  t.prerequisites?.forEach((p) => check('prerequisite', p))
  t.related?.forEach((p) => check('related', p))
  t.deeper?.forEach((p) => check('deeper', p))
  t.research?.forEach((r) => {
    if (!papers[r.paper]) problems.push(`${t.id}: unknown paper "${r.paper}"`)
  })
  if (t.parent) {
    const parent = allTopics.find((x) => x.id === t.parent)
    if (parent && parent.level !== t.level - 1) problems.push(`${t.id}: level ${t.level} but parent ${parent.id} is level ${parent.level}`)
  }
  for (const f of textFields) {
    const text = t[f]
    if (!text) continue
    for (const m of text.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) check(`link in ${f}`, m[1])
    const dollars = (text.replace(/\$\$/g, '').match(/\$/g) ?? []).length
    if (dollars % 2) problems.push(`${t.id}: unbalanced $ in ${f}`)
  }
}
const cited = new Set(allTopics.flatMap((t) => t.research?.map((r) => r.paper) ?? []))
for (const id of Object.keys(papers)) if (!cited.has(id)) problems.push(`paper "${id}" is never cited`)

console.log(`${allTopics.length} topics · ${Object.keys(papers).length} papers`)
if (problems.length) {
  console.error(problems.map((p) => '  ✗ ' + p).join('\n'))
  process.exit(1)
}
console.log('  ✓ all references resolve')
