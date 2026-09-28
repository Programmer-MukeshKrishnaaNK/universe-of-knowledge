import { universe } from '../../graph'

/**
 * Chooses the knowledge source before the universe initialises.
 *
 * Production always uses the curated, bundled universe. In development only,
 * `?stress=N` swaps in a synthetic universe of N concepts for load testing;
 * the generator is behind `import.meta.env.DEV`, so it is never part of a
 * production bundle.
 */
export async function prepareSource() {
  if (!import.meta.env.DEV) return
  const n = Number(new URLSearchParams(location.search).get('stress'))
  if (!Number.isFinite(n) || n <= 0) return
  const { SyntheticSource } = await import('../../dev/synthetic')
  universe.setSource(new SyntheticSource(Math.min(60000, Math.round(n))))
}
