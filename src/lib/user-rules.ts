import type { Role } from '~/server/auth/session'

export const ASSIGNABLE_ROLES: Role[] = [
	'requests',
	'pre-authorizations',
	'authorizations',
	'admin',
]

export function countValidBackupCodes(totpBackupCodes: string | null): number {
	if (!totpBackupCodes) return 0
	try {
		const parsed: unknown = JSON.parse(totpBackupCodes)
		if (!Array.isArray(parsed)) return 0
		return parsed.filter(
			(code): code is string => typeof code === 'string' && code.trim() !== '',
		).length
	} catch {
		return 0
	}
}
