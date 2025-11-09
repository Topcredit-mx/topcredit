import { NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'
import type { Role } from './lib/auth-utils'

const authPages = [
	'/login',
	'/signup',
	'/verify-otp',
	'/verify-totp',
	'/verify-backup-code',
]

const employeeRoles: Role[] = [
	'sales_rep',
	'credit_analyst',
	'accountant',
	'support',
	'admin',
]

export default withAuth(
	function middleware(req) {
		const token = req.nextauth.token
		const path = req.nextUrl.pathname
		const roles = token?.roles || []

		// Redirect authenticated users from landing page to their dashboard
		if (token && path === '/') {
			const hasEmployeeRole = roles.some((role) => employeeRoles.includes(role))

			if (hasEmployeeRole) {
				return NextResponse.redirect(new URL('/app', req.url))
			}

			return NextResponse.redirect(new URL('/dashboard', req.url))
		}

		// Redirect authenticated users from auth pages to their dashboard
		if (token && authPages.includes(path)) {
			const hasEmployeeRole = roles.some((role) => employeeRoles.includes(role))

			if (hasEmployeeRole) {
				return NextResponse.redirect(new URL('/app', req.url))
			}

			return NextResponse.redirect(new URL('/dashboard', req.url))
		}

		// Employee app routes - any employee role
		if (path.startsWith('/app')) {
			const hasEmployeeRole = roles.some((role) => employeeRoles.includes(role))

			if (!hasEmployeeRole) {
				return NextResponse.redirect(new URL('/unauthorized', req.url))
			}
		}

		// Dashboard is for customers only
		if (path.startsWith('/dashboard')) {
			if (!roles.includes('customer')) {
				return NextResponse.redirect(new URL('/unauthorized', req.url))
			}
		}

		return NextResponse.next()
	},
	{
		callbacks: {
			authorized: ({ token, req }) => {
				const path = req.nextUrl.pathname

				// Auth pages and landing page are always allowed
				if (authPages.includes(path) || path === '/') {
					return true
				}

				// Protected routes require a token
				return !!token
			},
		},
	},
)

export const config = {
	matcher: [
		'/',
		'/dashboard',
		'/dashboard/:path*',
		'/app',
		'/app/:path*',
		'/settings/:path*',
		'/login',
		'/signup',
		'/verify-otp',
		'/verify-totp',
		'/verify-backup-code',
		'/setup-totp',
	],
}
