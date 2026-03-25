import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from './config'

export type Role =
	| 'applicant'
	| 'agent'
	| 'requests'
	| 'pre-authorizations'
	| 'authorizations'
	| 'admin'

export async function requireAuth() {
	const session = await getServerSession(authOptions)
	if (!session?.user) {
		redirect('/login')
	}
	return session
}

export async function redirectIfLoggedIn() {
	const session = await getServerSession(authOptions)
	const roles = session?.user?.roles ?? []
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
	const session = await getServerSession(authOptions)
	if (!session?.user) {
		redirect('/login')
	}
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
		redirect('/unauthorized')
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
		redirect('/unauthorized')
	}
	return user
}

export async function requireAnyRole(allowedRoles: Role[]) {
	const session = await requireAuth()
	const hasAccess = allowedRoles.some((role) =>
		session.user.roles.includes(role),
	)
	if (!hasAccess) redirect('/unauthorized')
	return session
}

export async function requireAllRoles(requiredRoles: Role[]) {
	const session = await requireAuth()
	const hasAccess = requiredRoles.every((role) =>
		session.user.roles.includes(role),
	)
	if (!hasAccess) redirect('/unauthorized')
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
