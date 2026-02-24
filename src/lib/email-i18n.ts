/**
 * Email translations. Loads from src/messages/email/{locale}.json so emails
 * work without Next.js request context (e.g. Inngest).
 */

import type esEmail from '../messages/email/es.json'

type Messages = Record<string, unknown>

/** All dot-separated paths to string leaves in the email messages schema. */
type PathsToLeaves<T, P extends string = ''> = T extends string
	? P
	: T extends object
		? {
				[K in keyof T]: PathsToLeaves<
					T[K],
					P extends '' ? (K & string) : `${P}.${K & string}`
				>
			}[keyof T] extends infer R
			? R extends string
				? R
				: never
			: never
	: never

/** Type-safe key: only valid paths from messages/email/es.json. */
export type EmailMessageKey = PathsToLeaves<typeof esEmail>

function getNested(obj: Messages, path: string): unknown {
	return path.split('.').reduce<unknown>((acc, part) => {
		if (acc === undefined || acc === null) return undefined
		return typeof acc === 'object' && acc !== null && part in acc
			? (acc as Record<string, unknown>)[part]
			: undefined
	}, obj)
}

function interpolate(
	str: string,
	params: Record<string, string | number | undefined> | undefined,
): string {
	if (!params) return str
	return str.replace(/\{(\w+)\}/g, (_, key) => {
		const v = params[key]
		return v !== undefined && v !== null ? String(v) : `{${key}}`
	})
}

let cached: { locale: string; messages: Messages } | null = null

async function loadEmailMessages(locale: string): Promise<Messages> {
	if (cached?.locale === locale) return cached.messages
	const messages = (await import(
		`../messages/email/${locale}.json`
	)).default as Messages
	cached = { locale, messages }
	return messages
}

/** Translation function for use in email templates. Pass as `t` prop from getEmailTranslations. */
export type EmailT = (
	key: EmailMessageKey,
	params?: Record<string, string | number | undefined>,
) => string

export type EmailTranslations = {
	t: EmailT
	get: (
		key: string,
	) => Record<string, string> | string | undefined
}

/**
 * Returns email translations for the given locale. Keys are dot-separated paths
 * e.g. "applicationStatus.statusLabel.pre-authorized".
 * Use t(key, { param: value }) for interpolation of {param} in the string.
 */
export async function getEmailTranslations(
	locale: string = 'es',
): Promise<EmailTranslations> {
	const messages = await loadEmailMessages(locale)

	return {
		t(key: string, params?: Record<string, string | number | undefined>): string {
			const value = getNested(messages, key)
			if (typeof value !== 'string') return key
			return interpolate(value, params)
		},
		get(key: string): Record<string, string> | string | undefined {
			const value = getNested(messages, key)
			if (value === undefined) return undefined
			if (typeof value === 'string') return value
			if (typeof value === 'object' && value !== null && !Array.isArray(value))
				return value as Record<string, string>
			return undefined
		},
	}
}
