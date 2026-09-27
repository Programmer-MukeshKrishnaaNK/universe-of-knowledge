import { allTopics } from '../data'
import { KnowledgeGraph } from './buildGraph'
import { computeLayout, type Layout } from './layout'
import { TopicSearch } from './search'

export { KnowledgeGraph } from './buildGraph'

/** The shared, built-once knowledge universe. */
export const graph = new KnowledgeGraph(allTopics)
export const search = new TopicSearch(allTopics)

let layout: Layout | null = null
/** Layout is computed lazily so the loading sequence can show real progress. */
export function getLayout(): Layout {
  if (!layout) layout = computeLayout(graph)
  return layout
}
