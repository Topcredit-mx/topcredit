import { NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'

export default withAuth(
	function middleware(req) {
		const token = req.nextauth.token
		const path = req.nextUrl.pathname
		const roles = (token?.roles as string[]) || []

		// Admin routes - only admin can access
		if (path.startsWith('/admin')) {
			if (!roles.includes('admin')) {
				return NextResponse.redirect(new URL('/unauthorized', req.url))
			}
		}

		// Finance routes - accountant or admin
		if (path.startsWith('/finance')) {
			if (!roles.includes('accountant') && !roles.includes('admin')) {
				return NextResponse.redirect(new URL('/unauthorized', req.url))
			}
		}

		// Sales routes - sales_rep or admin
		if (path.startsWith('/sales')) {
			if (!roles.includes('sales_rep') && !roles.includes('admin')) {
				return NextResponse.redirect(new URL('/unauthorized', req.url))
			}
		}

		// Credit analyst routes - credit_analyst or admin
		if (path.startsWith('/applications') || path.startsWith('/credits')) {
			if (!roles.includes('credit_analyst') && !roles.includes('admin')) {
				return NextResponse.redirect(new URL('/unauthorized', req.url))
			}
		}

		// Support routes - support or admin
		if (path.startsWith('/support')) {
			if (!roles.includes('support') && !roles.includes('admin')) {
				return NextResponse.redirect(new URL('/unauthorized', req.url))
			}
		}

		// Employee routes - any employee role or admin
		if (path.startsWith('/employee')) {
			const employeeRoles = [
				'sales_rep',
				'credit_analyst',
				'accountant',
				'support',
				'admin',
			]
			const hasEmployeeRole = roles.some((role) => employeeRoles.includes(role))

			if (!hasEmployeeRole) {
				return NextResponse.redirect(new URL('/unauthorized', req.url))
			}
		}

		return NextResponse.next()
	},
	{
		callbacks: {
			authorized: ({ token }) => !!token,
		},
	},
)

export const config = {
	matcher: [
		'/dashboard/:path*',
		'/admin/:path*',
		'/finance/:path*',
		'/sales/:path*',
		'/applications/:path*',
		'/credits/:path*',
		'/support/:path*',
		'/employee/:path*',
		'/settings/:path*',
	],
}
