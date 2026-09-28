/**
 * Validates the curated dataset with the same rules imported data must pass.
 * Run: npm run check:data
 */
import { allTopics, papers } from '../src/data'
import { contentHash, validateTopics } from '../src/knowledge/validate'

const issues = validateTopics(allTopics, { papers })
const cited = new Set(allTopics.flatMap((t) => t.research?.map((r) => r.paper) ?? []))
for (const id of Object.keys(papers)) if (!cited.has(id)) issues.push({ severity: 'warning', code: 'unknown-paper', id, message: `paper "${id}" is never cited` })

const errors = issues.filter((i) => i.severity === 'error')
const warnings = issues.filter((i) => i.severity === 'warning')
console.log(`${allTopics.length} topics · ${Object.keys(papers).length} papers · content ${contentHash(allTopics)}`)
for (const w of warnings) console.warn(`  ! ${w.id}: ${w.message}`)
if (errors.length) {
  for (const e of errors) console.error(`  ✗ ${e.id}: ${e.message}`)
  process.exit(1)
}
console.log(`  ✓ all references resolve (${warnings.length} warning${warnings.length === 1 ? '' : 's'})`)
