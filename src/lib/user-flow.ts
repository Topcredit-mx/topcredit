import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '~/server/auth/config'

/**
 * User onboarding/flow steps
 */
export type UserStep =
	| 'landing' // Not authenticated - show landing page
	| 'authenticated' // Basic authenticated user - go to dashboard/settings
	| 'onboarding' // User needs to complete onboarding
	| 'kyc-pending' // KYC verification pending
	| 'application' // Has active credit application
	| 'approved' // Credit approved - can manage loan
	| 'rejected' // Credit rejected

/**
 * Route mappings for each user step
 */
const STEP_ROUTES: Record<UserStep, string> = {
	landing: '/',
	authenticated: '/dashboard',
	onboarding: '/onboarding',
	'kyc-pending': '/kyc-status',
	application: '/application-status',
	approved: '/dashboard',
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

	// TODO: Add database queries to check user state
	// For now, just redirect authenticated users to settings
	// In the future, we'll check:
	// - Has completed onboarding?
	// - Has submitted KYC?
	// - Has active credit application?
	// - Application status (approved/rejected/pending)?

	return 'authenticated'
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
