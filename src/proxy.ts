import type { NextFetchEvent, NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { withAuth } from 'next-auth/middleware'
import type { Role } from '~/lib/auth-utils'

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
	const roles: Role[] = token?.roles ?? []
	if (roles.includes('agent'))
		return NextResponse.redirect(new URL('/app', req.url))
	if (roles.includes('applicant'))
		return NextResponse.redirect(new URL('/dashboard', req.url))
	return null
}

const withAuthMiddleware = withAuth(
	function middleware(req) {
		const token = req.nextauth.token
		const path = req.nextUrl.pathname
		const roles: Role[] = token?.roles ?? []
		const isAgent = roles.includes('agent')

		if (
			(path.startsWith('/app/users') || path.startsWith('/app/companies')) &&
			!roles.includes('admin')
		) {
			return NextResponse.redirect(new URL('/unauthorized', req.url))
		}
		if (path.startsWith('/app') && !isAgent) {
			return NextResponse.redirect(new URL('/unauthorized', req.url))
		}
		if (path.startsWith('/dashboard') && !roles.includes('applicant')) {
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
		'/dashboard',
		'/dashboard/:path*',
		'/app',
		'/app/:path*',
		'/settings',
		'/settings/:path*',
		'/setup-totp',
	],
}
