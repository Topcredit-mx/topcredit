/** Rate limit helpers in their own file to avoid session → config → actions → session cycle. */
import { eq } from 'drizzle-orm'
import { db } from '~/server/db'
import { users } from '~/server/db/schema'

const RATE_LIMIT_CONFIG = {
	windowMinutes: 30,
	maxAttempts: 5,
} as const

export function checkRateLimit(
	lastOtpSentAt: Date | null,
	loginFailedAttempts: number,
): 'reset' | 'increment' {
	const windowMs = RATE_LIMIT_CONFIG.windowMinutes * 60 * 1000
	const windowStart = new Date(Date.now() - windowMs)

	if (!lastOtpSentAt || lastOtpSentAt < windowStart) {
		return 'reset'
	}
	if (loginFailedAttempts >= RATE_LIMIT_CONFIG.maxAttempts) {
		const timeRemaining = Math.ceil(
			(windowMs - (Date.now() - lastOtpSentAt.getTime())) / 60000,
		)
		throw new Error(
			`Demasiados intentos. Por favor espera ${timeRemaining} minuto${timeRemaining !== 1 ? 's' : ''} más antes de intentar de nuevo.`,
		)
	}
	return 'increment'
}

export async function updateRateLimitCounters(
	userId: number,
	action: 'reset' | 'increment',
	currentAttempts: number,
): Promise<void> {
	try {
		if (action === 'reset') {
			await db
				.update(users)
				.set({
					loginFailedAttempts: 1,
					lastOtpSentAt: new Date(),
				})
				.where(eq(users.id, userId))
		} else if (action === 'increment') {
			await db
				.update(users)
				.set({
					loginFailedAttempts: currentAttempts + 1,
					lastOtpSentAt: new Date(),
				})
				.where(eq(users.id, userId))
		}
	} catch (error) {
		console.error('Failed to update rate limit counters:', error)
	}
}
