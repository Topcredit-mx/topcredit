import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { withAuth } from 'next-auth/middleware'
import type { Role } from './session'

const authPaths = [
	'/',
	'/login',
	'/signup',
	'/verify-otp',
	'/verify-totp',
	'/verify-backup-code',
] as const

type AuthPath = (typeof authPaths)[number]

export function isAuthPath(path: string): path is AuthPath {
	return (authPaths as readonly string[]).includes(path)
}

export async function redirectLoggedInFromAuthRoutes(
	req: NextRequest,
): Promise<NextResponse | null> {
	const path = req.nextUrl.pathname
	if (!isAuthPath(path)) return null

	const token = await getToken({ req })
	if (!token) return null

	const roles: Role[] = token.roles ?? []
	if (roles.includes('agent')) {
		return NextResponse.redirect(new URL('/app', req.url))
	}
	if (roles.includes('applicant')) {
		return NextResponse.redirect(new URL('/dashboard', req.url))
	}
	if (roles.length === 0) {
		return NextResponse.redirect(new URL('/settings', req.url))
	}

	return null
}

export const withAppAuth = withAuth(
	function middleware(req) {
		const token = req.nextauth.token
		const path = req.nextUrl.pathname
		const roles: Role[] = token?.roles ?? []
		const isAgent = roles.includes('agent')

		if (roles.length === 0) {
			if (path.startsWith('/app') || path.startsWith('/dashboard')) {
				return NextResponse.redirect(new URL('/unauthorized', req.url))
			}
		}

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
			authorized: ({ token }) => token != null,
		},
	},
)

export const authMiddlewareMatcher = [
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
] as const
