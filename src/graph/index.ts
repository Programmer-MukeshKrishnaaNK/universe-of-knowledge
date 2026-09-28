import { Universe } from '../knowledge/universe'
import { BundledSource } from '../knowledge/sources/bundled'

export { KnowledgeGraph } from '../knowledge/graph'

/**
 * The live universe. It starts empty and fills region by region; `graph`
 * and `search` are the same objects throughout, so modules can hold them.
 */
export const universe = new Universe()
universe.setSource(new BundledSource())

export const graph = universe.graph
export const search = universe.search

/** Live layout view (positions grow as regions load). */
export function getLayout() {
  return {
    get positions() {
      return universe.positions
    },
    domainRadius: universe.domainRadius,
    get center() {
      return universe.center
    },
  }
}
