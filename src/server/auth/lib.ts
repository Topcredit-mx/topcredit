import { eq } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import type { Role } from '~/lib/auth-utils'
import { db } from '../db'
import { users } from '../db/schema'
import { authOptions } from './config'

// Rate limiting configuration
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

	// Case 1: First request or window expired - allow and reset counter
	if (!lastOtpSentAt || lastOtpSentAt < windowStart) {
		return 'reset'
	}

	// Case 2: Exceeded rate limit within window - throw error
	if (loginFailedAttempts >= RATE_LIMIT_CONFIG.maxAttempts) {
		const timeRemaining = Math.ceil(
			(windowMs - (Date.now() - lastOtpSentAt.getTime())) / 60000,
		)
		throw new Error(
			`Demasiados intentos. Por favor espera ${timeRemaining} minuto${timeRemaining !== 1 ? 's' : ''} más antes de intentar de nuevo.`,
		)
	}

	// Case 3: Within rate limit - allow and increment counter
	return 'increment'
}

/**
 * Updates user rate limiting counters based on the result of checkRateLimit
 */
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
		// Don't throw - this shouldn't block the main flow
	}
}

// ==============================================================================
// Server-side User Helpers
// ==============================================================================

/**
 * Gets the current authenticated user from the session.
 * Throws an error if no session exists (should never happen due to middleware protection).
 *
 * Use this in protected routes where middleware guarantees authentication.
 */
export async function getRequiredUser(): Promise<{
	id: number
	name?: string | null
	email?: string | null
	image?: string | null
	roles: Role[]
}> {
	const session = await getServerSession(authOptions)

	if (!session?.user) {
		throw new Error(
			'Unauthorized: No session found. This should not happen due to middleware protection.',
		)
	}

	return session.user
}

/**
 * Gets the current user and verifies they have the employee role.
 *
 * Use this in /app routes to ensure the user is an employee.
 */
export async function getRequiredEmployeeUser(): Promise<{
	id: number
	name?: string | null
	email?: string | null
	image?: string | null
	roles: Role[]
}> {
	const user = await getRequiredUser()

	if (!user.roles.includes('employee')) {
		throw new Error(
			'Unauthorized: User does not have the employee role. This should not happen due to middleware protection.',
		)
	}

	return user
}

/**
 * Gets the current user and verifies they have the customer role.
 *
 * Use this in /dashboard routes to ensure the user is a customer.
 */
export async function getRequiredCustomerUser(): Promise<{
	id: number
	name?: string | null
	email?: string | null
	image?: string | null
	roles: Role[]
}> {
	const user = await getRequiredUser()

	if (!user.roles.includes('customer')) {
		throw new Error(
			'Unauthorized: User does not have customer role. This should not happen due to middleware protection.',
		)
	}

	return user
}
