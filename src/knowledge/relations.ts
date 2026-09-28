import type { RelationshipType } from '../data/schema'

/**
 * The relationship registry. Every relationship type the universe knows is
 * declared here once: how it is stored (code), whether it has a direction,
 * how "far" it is for route finding, and how the renderer should treat it.
 * Adding a new type is one entry — no other code needs to change.
 */
export interface RelationSpec {
  code: number
  /** Dependencies have a direction (A enables B); associations do not. */
  directed: boolean
  /** Route cost of crossing one such edge. Lower = more natural to follow. */
  cost: number
  /** When two relationships join the same pair, the lower rank is kept for rendering. */
  rank: number
  /** Rendering family: 'structure' (hierarchy), 'flow' (dependency), 'association'. */
  family: 'structure' | 'flow' | 'association'
  label: string
  /** Reverse phrasing, from the target's point of view. */
  inverse: string
}

export const RELATIONS: Record<RelationshipType, RelationSpec> = {
  contains: { code: 0, directed: true, cost: 1, rank: 0, family: 'structure', label: 'contains', inverse: 'part of' },
  prerequisite: { code: 1, directed: true, cost: 1.15, rank: 1, family: 'flow', label: 'leads to', inverse: 'builds on' },
  derived_from: { code: 6, directed: true, cost: 1.3, rank: 2, family: 'flow', label: 'gives rise to', inverse: 'derived from' },
  uses: { code: 7, directed: true, cost: 1.5, rank: 3, family: 'flow', label: 'is used by', inverse: 'uses' },
  application: { code: 4, directed: true, cost: 1.9, rank: 4, family: 'flow', label: 'is applied in', inverse: 'applies' },
  related: { code: 2, directed: false, cost: 2, rank: 5, family: 'association', label: 'relates to', inverse: 'relates to' },
  bridge: { code: 3, directed: false, cost: 2.3, rank: 6, family: 'association', label: 'bridges to', inverse: 'bridges to' },
  historical: { code: 5, directed: true, cost: 3, rank: 7, family: 'association', label: 'preceded', inverse: 'followed' },
}

export const RELATION_BY_CODE: RelationshipType[] = []
for (const [type, spec] of Object.entries(RELATIONS)) RELATION_BY_CODE[spec.code] = type as RelationshipType

/** Extra route cost for stepping into another domain — crossings are allowed, but deliberate. */
export const CROSS_DOMAIN_COST = 0.6
