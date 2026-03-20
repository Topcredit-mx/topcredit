import type { NextFetchEvent, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { withAuth } from 'next-auth/middleware'
import type { Role } from '~/server/auth/session'

const authPaths = [
	'/',
	'/login',
	'/signup',
	'/verify-otp',
	'/verify-totp',
	'/verify-backup-code',
]

async function redirectLoggedInFromAuthRoutes(
	req: NextRequest,
): Promise<NextResponse | null> {
	const path = req.nextUrl.pathname
	if (!authPaths.includes(path)) return null

	const token = await getToken({ req })
	if (!token) return null
	const roles: Role[] = token.roles ?? []
	if (roles.includes('agent'))
		return NextResponse.redirect(new URL('/equipo', req.url))
	if (roles.includes('applicant'))
		return NextResponse.redirect(new URL('/cuenta', req.url))
	if (roles.length === 0)
		return NextResponse.redirect(new URL('/settings', req.url))
	return null
}

const withAuthMiddleware = withAuth(
	function middleware(req) {
		const token = req.nextauth.token
		const path = req.nextUrl.pathname
		const roles: Role[] = token?.roles ?? []
		const isAgent = roles.includes('agent')

		// Applicants: settings live under /cuenta/settings (same shell as rest of portal).
		if (roles.includes('applicant') && path.startsWith('/settings')) {
			const suffix =
				path === '/settings' ? '/profile' : path.slice('/settings'.length)
			return NextResponse.redirect(
				new URL(`/cuenta/settings${suffix}`, req.url),
			)
		}

		// No roles: allow /settings so user can see their state; block /equipo and /cuenta
		if (roles.length === 0) {
			if (path.startsWith('/equipo') || path.startsWith('/cuenta')) {
				return NextResponse.redirect(new URL('/unauthorized', req.url))
			}
			// /settings allowed - user can see they have no roles
		}
		if (
			(path.startsWith('/equipo/users') ||
				path.startsWith('/equipo/companies')) &&
			!roles.includes('admin')
		) {
			return NextResponse.redirect(new URL('/unauthorized', req.url))
		}
		if (path.startsWith('/equipo') && !isAgent) {
			return NextResponse.redirect(new URL('/unauthorized', req.url))
		}
		if (path.startsWith('/cuenta') && !roles.includes('applicant')) {
			return NextResponse.redirect(new URL('/unauthorized', req.url))
		}

		return NextResponse.next()
	},
	{
		pages: { signIn: '/login' },
		callbacks: {
			authorized: ({ token }) => !!token,
		},
	},
)

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
	const path = req.nextUrl.pathname
	const redirect = await redirectLoggedInFromAuthRoutes(req)
	if (redirect) return redirect
	// Auth paths: allow through (unauth users see login/landing). Protected paths: require auth.
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
