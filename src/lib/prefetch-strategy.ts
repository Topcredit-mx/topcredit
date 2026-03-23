export type PrefetchStrategy = 'viewport' | 'hover'

const PREFETCH_HOVER_THRESHOLD = 50

export function getPrefetchStrategy(listLength: number): PrefetchStrategy {
	return listLength >= PREFETCH_HOVER_THRESHOLD ? 'hover' : 'viewport'
}
