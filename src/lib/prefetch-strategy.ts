/** When to prefetch: viewport = when link enters viewport (full route). hover = only on mouse enter (avoids prefetching many rows at once). */
export type PrefetchStrategy = 'viewport' | 'hover'

const PREFETCH_HOVER_THRESHOLD = 50

/** Use when list length >= this to switch from viewport prefetch to hover-only prefetch. */
export function getPrefetchStrategy(listLength: number): PrefetchStrategy {
	return listLength >= PREFETCH_HOVER_THRESHOLD ? 'hover' : 'viewport'
}
