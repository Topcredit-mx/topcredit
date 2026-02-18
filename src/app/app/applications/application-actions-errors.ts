/**
 * Maps server-returned error keys to translated messages for application status actions.
 */

const ERROR_KEYS = [
	'applications-reason-required',
	'applications-error-transition',
	'applications-error-generic',
	'applications-not-found',
] as const

type ErrorKey = (typeof ERROR_KEYS)[number]

const ERROR_KEYS_SET = new Set<string>(ERROR_KEYS)

function isErrorKey(s: string): s is ErrorKey {
	return ERROR_KEYS_SET.has(s)
}

export function translateApplicationActionError(
	t: (k: string) => string,
	error: string,
): string {
	return isErrorKey(error) ? t(error) : error
}
