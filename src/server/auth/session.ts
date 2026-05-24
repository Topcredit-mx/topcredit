import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { accessDenied } from '~/server/auth/access-denied'
import {
	getDbSessionUser,
	signOutToLoginPath,
} from '~/server/auth/db-session-user'
import { getRequestJwtTokenIssuedAt } from '~/server/auth/jwt-token'
import { authOptions } from './config'

export type Role =
	| 'applicant'
	| 'agent'
	| 'requests'
	| 'pre-authorizations'
	| 'authorizations'
	| 'hr'
	| 'dispersions'
	| 'installments'
	| 'liquidations'
	| 'admin'

export async function requireAuth() {
	const session = await getServerSession(authOptions)
	if (!session?.user) {
		redirect('/login')
	}

	const tokenIssuedAt = await getRequestJwtTokenIssuedAt()
	const dbUser = await getDbSessionUser(session.user.id, tokenIssuedAt)
	if (!dbUser) {
		redirect(signOutToLoginPath)
	}

	return {
		...session,
		user: {
			...session.user,
			id: dbUser.id,
			name: dbUser.name,
			email: dbUser.email,
			roles: dbUser.roles,
		},
	}
}

export async function redirectIfLoggedIn() {
	const session = await getServerSession(authOptions)
	if (!session?.user) return

	const tokenIssuedAt = await getRequestJwtTokenIssuedAt()
	const dbUser = await getDbSessionUser(session.user.id, tokenIssuedAt)
	if (!dbUser) {
		redirect(signOutToLoginPath)
	}

	const roles = dbUser.roles
	if (roles.includes('agent')) redirect('/equipo')
	if (roles.includes('applicant')) redirect('/cuenta')
}

export async function getRequiredUser(): Promise<{
	id: number
	name?: string | null
	email?: string | null
	image?: string | null
	roles: Role[]
}> {
	const session = await requireAuth()
	return session.user
}

export async function getRequiredApplicantUser(): Promise<{
	id: number
	name?: string | null
	email?: string | null
	image?: string | null
	roles: Role[]
}> {
	const session = await requireAuth()
	const user = session.user
	if (!user.roles.includes('applicant')) {
		accessDenied()
	}
	return user
}

export async function getRequiredAgentUser(): Promise<{
	id: number
	name?: string | null
	email?: string | null
	image?: string | null
	roles: Role[]
}> {
	const session = await requireAuth()
	const user = session.user
	if (!user.roles.includes('agent')) {
		accessDenied()
	}
	return user
}

export async function requireAnyRole(allowedRoles: Role[]) {
	const session = await requireAuth()
	const hasAccess = allowedRoles.some((role) =>
		session.user.roles.includes(role),
	)
	if (!hasAccess) accessDenied()
	return session
}

export async function requireAllRoles(requiredRoles: Role[]) {
	const session = await requireAuth()
	const hasAccess = requiredRoles.every((role) =>
		session.user.roles.includes(role),
	)
	if (!hasAccess) accessDenied()
	return session
}

export async function hasRole(role: Role): Promise<boolean> {
	const session = await getServerSession(authOptions)
	return session?.user?.roles?.includes(role) ?? false
}

export async function hasAnyRole(roles: Role[]): Promise<boolean> {
	const session = await getServerSession(authOptions)
	return roles.some((role) => session?.user?.roles?.includes(role)) ?? false
}

export async function hasAllRoles(roles: Role[]): Promise<boolean> {
	const session = await getServerSession(authOptions)
	return roles.every((role) => session?.user?.roles?.includes(role)) ?? false
}

export async function getCurrentUserRoles(): Promise<Role[]> {
	const session = await getServerSession(authOptions)
	return session?.user?.roles ?? []
}
