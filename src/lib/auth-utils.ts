import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '~/server/auth/config'

export type Role = 'customer' | 'employee' | 'requests' | 'admin'

/**
 * If user is logged in with a known role, redirect to their app (dashboard or /app).
 * The proxy already does this for /, /login, /signup, and verify-* routes. Use this in
 * other pages (e.g. a new auth route) if you need the same behavior.
 */
export async function redirectIfLoggedIn() {
	const session = await getServerSession(authOptions)
	const roles = session?.user?.roles ?? []
	if (roles.includes('employee')) redirect('/app')
	if (roles.includes('customer')) redirect('/dashboard')
}

/**
 * Requires user to be authenticated.
 * Redirects to /login if not authenticated.
 */
export async function requireAuth() {
	const session = await getServerSession(authOptions)
	if (!session?.user) {
		redirect('/login')
	}
	return session
}

/**
 * Requires user to have at least ONE of the specified roles.
 * Redirects to /unauthorized if user doesn't have any of the required roles.
 *
 * @example
 * // Allow access for requests OR admins
 * await requireAnyRole(['requests', 'admin'])
 */
export async function requireAnyRole(allowedRoles: Role[]) {
	const session = await requireAuth()
	const userRoles = session.user.roles

	const hasAccess = allowedRoles.some((role) => userRoles.includes(role))

	if (!hasAccess) {
		redirect('/unauthorized')
	}

	return session
}

/**
 * Requires user to have ALL of the specified roles.
 * Redirects to /unauthorized if user is missing any required role.
 *
 * @example
 * // User must be both requests AND admin
 * await requireAllRoles(['requests', 'admin'])
 */
export async function requireAllRoles(requiredRoles: Role[]) {
	const session = await requireAuth()
	const userRoles = session.user.roles

	const hasAccess = requiredRoles.every((role) => userRoles.includes(role))

	if (!hasAccess) {
		redirect('/unauthorized')
	}

	return session
}

/**
 * Checks if the current user has a specific role.
 * Returns false if user is not authenticated.
 *
 * @example
 * const isAdmin = await hasRole('admin')
 */
export async function hasRole(role: Role): Promise<boolean> {
	const session = await getServerSession(authOptions)
	return session?.user?.roles?.includes(role) ?? false
}

/**
 * Checks if the current user has ANY of the specified roles.
 * Returns false if user is not authenticated.
 *
 * @example
 * const canViewRequests = await hasAnyRole(['requests', 'admin'])
 */
export async function hasAnyRole(roles: Role[]): Promise<boolean> {
	const session = await getServerSession(authOptions)
	return roles.some((role) => session?.user?.roles?.includes(role)) ?? false
}

/**
 * Checks if the current user has ALL of the specified roles.
 * Returns false if user is not authenticated or missing any role.
 *
 * @example
 * const isSuperUser = await hasAllRoles(['admin', 'requests'])
 */
export async function hasAllRoles(roles: Role[]): Promise<boolean> {
	const session = await getServerSession(authOptions)
	return roles.every((role) => session?.user?.roles?.includes(role)) ?? false
}

/**
 * Gets the current user's roles.
 * Returns empty array if not authenticated.
 */
export async function getCurrentUserRoles(): Promise<Role[]> {
	const session = await getServerSession(authOptions)
	return session?.user?.roles ?? []
}
