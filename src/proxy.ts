import type { NextFetchEvent, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { withAuth } from 'next-auth/middleware'
import {
	getDbSessionUser,
	parseSessionUserId,
	parseTokenIssuedAt,
	signOutToLoginPath,
} from '~/server/auth/db-session-user'
import type { Role } from '~/server/auth/session'

const authPaths = [
	'/',
	'/login',
	'/signup',
	'/verify-otp',
	'/verify-totp',
	'/verify-backup-code',
]

function signOutRedirect(req: NextRequest) {
	return NextResponse.redirect(new URL(signOutToLoginPath, req.url))
}

async function resolveDbRolesFromToken(
	req: NextRequest,
): Promise<Role[] | 'sign-out' | null> {
	const token = await getToken({ req })
	if (!token) return null

	const userId = parseSessionUserId(token.sub)
	if (userId === null) return 'sign-out'

	const tokenIssuedAt = parseTokenIssuedAt(token.iat)
	const dbUser = await getDbSessionUser(userId, tokenIssuedAt)
	if (!dbUser) return 'sign-out'

	return dbUser.roles
}

async function redirectLoggedInFromAuthRoutes(
	req: NextRequest,
): Promise<NextResponse | null> {
	const path = req.nextUrl.pathname
	if (!authPaths.includes(path)) return null

	const roles = await resolveDbRolesFromToken(req)
	if (roles === 'sign-out') return signOutRedirect(req)
	if (!roles) return null

	if (roles.includes('agent'))
		return NextResponse.redirect(new URL('/equipo', req.url))
	if (roles.includes('applicant'))
		return NextResponse.redirect(new URL('/cuenta', req.url))
	if (roles.length === 0)
		return NextResponse.redirect(new URL('/settings', req.url))
	return null
}

const withAuthMiddleware = withAuth(
	async function middleware(req) {
		const token = req.nextauth.token
		const path = req.nextUrl.pathname

		if (!token) {
			return NextResponse.next()
		}

		const userId = parseSessionUserId(token.sub)
		if (userId === null) {
			return signOutRedirect(req)
		}

		const tokenIssuedAt = parseTokenIssuedAt(token.iat)
		const dbUser = await getDbSessionUser(userId, tokenIssuedAt)
		if (!dbUser) {
			return signOutRedirect(req)
		}

		const roles = dbUser.roles

		if (roles.includes('applicant') && path.startsWith('/settings')) {
			const suffix =
				path === '/settings' ? '/profile' : path.slice('/settings'.length)
			return NextResponse.redirect(
				new URL(`/cuenta/settings${suffix}`, req.url),
			)
		}

		return NextResponse.next()
	},
	{
		pages: { signIn: '/login' },
		callbacks: {
			authorized: async ({ token }) => {
				if (!token) return false

				const userId = parseSessionUserId(token.sub)
				if (userId === null) return false

				const tokenIssuedAt = parseTokenIssuedAt(token.iat)
				const dbUser = await getDbSessionUser(userId, tokenIssuedAt)
				return dbUser !== null
			},
		},
	},
)

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
	const path = req.nextUrl.pathname
	const redirect = await redirectLoggedInFromAuthRoutes(req)
	if (redirect) return redirect
	if (authPaths.includes(path)) return NextResponse.next()
	return withAuthMiddleware(
		req as Parameters<typeof withAuthMiddleware>[0],
		event,
	)
}

export const config = {
	matcher: [
		'/',
		'/login',
		'/signup',
		'/verify-otp',
		'/verify-totp',
		'/verify-backup-code',
		'/cuenta',
		'/cuenta/:path*',
		'/equipo',
		'/equipo/:path*',
		'/settings',
		'/settings/:path*',
		'/setup-totp',
	],
}
