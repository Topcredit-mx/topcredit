import { desc, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '~/server/auth/config'
import { db } from '~/server/db'
import { creditApplications, credits } from '~/server/db/schema'

/**
 * User onboarding/flow steps
 */
export type UserStep =
	| 'landing' // Not authenticated - show landing page
	| 'apply_credit' // Authenticated but no credit application - needs to apply
	| 'application' // Has active credit application
	| 'approved' // Credit approved - can manage loan
	| 'active_loan' // Has active loan - show loan management
	| 'rejected' // Credit rejected

/**
 * Route mappings for each user step
 */
const STEP_ROUTES: Record<UserStep, string> = {
	landing: '/',
	apply_credit: '/apply',
	application: '/application-status',
	approved: '/dashboard',
	active_loan: '/dashboard',
	rejected: '/application-result',
}

/**
 * Determines what step/screen the user should see based on their current state
 */
export async function getUserStep(): Promise<UserStep> {
	const session = await getServerSession(authOptions)

	// Not logged in - show landing page
	if (!session?.user) {
		return 'landing'
	}

	const userId = session.user.id

	// Check for active loans first
	const activeLoan = await db
		.select()
		.from(credits)
		.where(eq(credits.userId, userId))
		.limit(1)

	if (activeLoan.length > 0) {
		return 'active_loan'
	}

	// Check for existing credit applications
	const existingApplication = await db
		.select()
		.from(creditApplications)
		.where(eq(creditApplications.userId, userId))
		.orderBy(desc(creditApplications.createdAt))
		.limit(1)

	if (existingApplication.length > 0) {
		const app = existingApplication[0]
		if (!app) return 'apply_credit'

		switch (app.status) {
			case 'draft':
			case 'submitted':
			case 'under_review':
				return 'application'
			case 'approved':
				return 'approved'
			case 'rejected':
			case 'cancelled':
				return 'rejected'
			case 'disbursed':
				// Should have created a credit record, but fallback to active_loan
				return 'active_loan'
			default:
				return 'apply_credit'
		}
	}

	// No credit history - needs to apply for first credit
	return 'apply_credit'
}

/**
 * Redirects user to appropriate screen based on their current step.
 * Call this in page components to enforce proper user flow.
 */
export async function redirectToUserStep(currentPath: string) {
	const userStep = await getUserStep()
	const targetRoute = STEP_ROUTES[userStep]

	// Only redirect if user is not already on the correct page
	if (currentPath !== targetRoute) {
		redirect(targetRoute)
	}
}

/**
 * Gets the appropriate route for a user step without redirecting
 */
export function getRouteForStep(step: UserStep): string {
	return STEP_ROUTES[step]
}

/**
 * Checks if user should see landing page (for conditional rendering)
 */
export async function shouldShowLanding(): Promise<boolean> {
	const userStep = await getUserStep()
	return userStep === 'landing'
}
