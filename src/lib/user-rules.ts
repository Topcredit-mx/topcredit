import type { Role } from '~/lib/auth-utils'

export const ASSIGNABLE_ROLES: Role[] = ['requests', 'admin']

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
