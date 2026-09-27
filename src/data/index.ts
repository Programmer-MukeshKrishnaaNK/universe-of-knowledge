import type { DomainId, Topic } from './schema'
import { domains } from './topics/domains'
import { mathematics } from './topics/mathematics'
import { physics } from './topics/physics'
import { quantum } from './topics/quantum'
import { astronomy } from './topics/astronomy'
import { computing } from './topics/computing'
import { frontier } from './topics/frontier'

export { papers } from './papers'
export * from './schema'

/**
 * Every authored topic. A future content backend would replace this with
 * paged region loads — nothing downstream depends on it being one array.
 */
export const allTopics: Topic[] = [
  ...domains,
  ...mathematics,
  ...physics,
  ...quantum,
  ...astronomy,
  ...computing,
  ...frontier,
]

/** Restrained, slightly desaturated hues — each domain has one. */
export const domainColor: Record<DomainId, string> = {
  mathematics: '#9fb6ff',
  physics: '#ffbf94',
  astronomy: '#c9a8ff',
  'computer-science': '#86e3cc',
  chemistry: '#ffa3b8',
  biology: '#b9e38f',
  'earth-science': '#e6d08c',
  neuroscience: '#f2a9e6',
  engineering: '#a9c3d1',
}

export const levelName = ['Domain', 'Field', 'Concept', 'Deep concept'] as const
