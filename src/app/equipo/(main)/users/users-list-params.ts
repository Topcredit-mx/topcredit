export const USERS_LIST_DEFAULT_PAGE_SIZE = 10
export const USERS_LIST_MAX_PAGE_SIZE = 50

export function firstSearchParam(
	value: string | string[] | undefined,
): string | undefined {
	if (value === undefined) return undefined
	return typeof value === 'string' ? value : value[0]
}

export function parseUsersListPage(raw: string | undefined): number {
	if (raw === undefined || raw.trim() === '') return 1
	const n = Number.parseInt(raw.trim(), 10)
	return Number.isFinite(n) && n >= 1 ? n : 1
}

export function parseUsersListLimit(raw: string | undefined): number {
	if (raw === undefined || raw.trim() === '')
		return USERS_LIST_DEFAULT_PAGE_SIZE
	const n = Number.parseInt(raw.trim(), 10)
	if (!Number.isFinite(n) || n < 1) return USERS_LIST_DEFAULT_PAGE_SIZE
	return Math.min(USERS_LIST_MAX_PAGE_SIZE, n)
}

export function parseUsersListSearchParam(
	raw: string | undefined,
): string | undefined {
	if (raw === undefined || raw.trim().length === 0) return undefined
	return raw.trim()
}

export type UsersListUrlState = {
	page: number
	limit: number
	search: string
}

export function buildUsersListUrl(
	pathname: string,
	next: UsersListUrlState,
): string {
	const params = new URLSearchParams()
	if (next.page > 1) params.set('page', String(next.page))
	if (next.limit !== USERS_LIST_DEFAULT_PAGE_SIZE) {
		params.set('limit', String(next.limit))
	}
	const trimmed = next.search.trim()
	if (trimmed.length > 0) params.set('search', trimmed)
	const qs = params.toString()
	return qs.length > 0 ? `${pathname}?${qs}` : pathname
}

export function firstParamFromSearchParams(
	value: string | string[] | null | undefined,
): string {
	if (value == null) return ''
	return typeof value === 'string' ? value : (value[0] ?? '')
}
