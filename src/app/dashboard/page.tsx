import { eq } from 'drizzle-orm'
import {
	AlertTriangle,
	CreditCard,
	FileText,
	Settings,
	User,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { getRequiredApplicantUser } from '~/server/auth/lib'
import { db } from '~/server/db'
import { isActiveApplicationStatus, users } from '~/server/db/schema'
import { getApplicationsByApplicantId } from '~/server/queries'

export default async function DashboardPage() {
	const tCommon = await getTranslations('common')
	const tDashboard = await getTranslations('dashboard')
	const sessionUser = await getRequiredApplicantUser()
	const [user, applicationsList] = await Promise.all([
		db.query.users.findFirst({
			where: eq(users.id, sessionUser.id),
			columns: { emailVerified: true },
		}),
		getApplicationsByApplicantId(sessionUser.id),
	])

	// Applicant entry: after login, 0 applications → create first solicitud; ≥1 → show dashboard
	if (applicationsList.length === 0) {
		redirect('/dashboard/applications/new')
	}

	const emailVerified = user?.emailVerified != null
	const activeRequestsCount = applicationsList.filter((a) =>
		isActiveApplicationStatus(a.status),
	).length

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<header className="bg-white shadow">
				<div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between">
						<h1 className="font-bold text-3xl text-gray-900 tracking-tight">
							{tDashboard('title')}
						</h1>
						<div className="flex items-center space-x-4">
							<span className="text-gray-500 text-sm">
								{tDashboard('welcome', { email: sessionUser.email ?? '' })}
							</span>
							<Button asChild variant="outline">
								<Link href="/api/auth/signout">{tCommon('sign-out')}</Link>
							</Button>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				{!emailVerified && (
					<div
						role="alert"
						className="mb-6 flex items-center gap-2 rounded-md bg-amber-50 px-4 py-3 text-amber-800 text-sm"
					>
						<AlertTriangle className="h-4 w-4 shrink-0" />
						<span>
							{tDashboard('verify-email')}{' '}
							<Link
								href="/settings/security"
								className="font-medium underline underline-offset-2"
							>
								{tCommon('settings')}
							</Link>{' '}
							{tDashboard('verify-email-suffix')}
						</span>
					</div>
				)}
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{/* Quick Actions */}
					<Card className="p-6">
						<div className="flex items-center">
							<CreditCard className="h-8 w-8 text-blue-600" />
							<div className="ml-4">
								<h3 className="font-medium text-gray-900 text-lg">
									{tDashboard('request-credit')}
								</h3>
								<p className="text-gray-500 text-sm">
									{tDashboard('request-credit-desc')}
								</p>
							</div>
						</div>
						<Button asChild className="mt-4 w-full">
							<Link href="/dashboard/applications/new">
								{tDashboard('request-now')}
							</Link>
						</Button>
					</Card>

					{/* Application Status */}
					<Card className="p-6">
						<div className="flex items-center">
							<FileText className="h-8 w-8 text-green-600" />
							<div className="ml-4">
								<h3 className="font-medium text-gray-900 text-lg">
									{tDashboard('application-status')}
								</h3>
								<p className="text-gray-500 text-sm">
									{tDashboard('application-status-desc')}
								</p>
							</div>
						</div>
						<Button asChild variant="outline" className="mt-4 w-full">
							<Link href="/dashboard/applications">
								{tDashboard('view-status')}
							</Link>
						</Button>
					</Card>

					{/* Settings */}
					<Card className="p-6">
						<div className="flex items-center">
							<Settings className="h-8 w-8 text-gray-600" />
							<div className="ml-4">
								<h3 className="font-medium text-gray-900 text-lg">
									{tCommon('settings')}
								</h3>
								<p className="text-gray-500 text-sm">
									{tDashboard('account-security')}
								</p>
							</div>
						</div>
						<Button asChild variant="outline" className="mt-4 w-full">
							<Link href="/settings">{tDashboard('configure')}</Link>
						</Button>
					</Card>
				</div>

				{/* Account Overview */}
				<div className="mt-8">
					<Card className="p-6">
						<h2 className="mb-4 font-semibold text-gray-900 text-xl">
							{tDashboard('account-overview')}
						</h2>
						<div className="grid gap-4 md:grid-cols-3">
							<div className="text-center">
								<div className="font-bold text-2xl text-muted-foreground">
									—
								</div>
								<div className="text-gray-500 text-sm">
									{tDashboard('available-balance')}
								</div>
							</div>
							<div className="text-center">
								<div className="font-bold text-2xl text-gray-600">
									{activeRequestsCount}
								</div>
								<div className="text-gray-500 text-sm">
									{tDashboard('active-requests')}
								</div>
							</div>
							<div className="text-center">
								<div className="font-bold text-2xl text-green-600">
									{tDashboard('active')}
								</div>
								<div className="text-gray-500 text-sm">
									{tDashboard('account-status')}
								</div>
							</div>
						</div>
					</Card>
				</div>

				{/* Quick Links */}
				<div className="mt-8">
					<h2 className="mb-4 font-semibold text-gray-900 text-xl">
						{tDashboard('quick-links')}
					</h2>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<Link
							href="/profile"
							className="flex items-center rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-md"
						>
							<User className="mr-3 h-6 w-6 text-blue-600" />
							<span className="font-medium">{tDashboard('my-profile')}</span>
						</Link>
						<Link
							href="/documents"
							className="flex items-center rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-md"
						>
							<FileText className="mr-3 h-6 w-6 text-green-600" />
							<span className="font-medium">{tDashboard('documents')}</span>
						</Link>
						<Link
							href="/help"
							className="flex items-center rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-md"
						>
							<Settings className="mr-3 h-6 w-6 text-gray-600" />
							<span className="font-medium">{tDashboard('help')}</span>
						</Link>
						<Link
							href="/contact"
							className="flex items-center rounded-lg bg-white p-4 shadow transition-shadow hover:shadow-md"
						>
							<CreditCard className="mr-3 h-6 w-6 text-purple-600" />
							<span className="font-medium">{tDashboard('contact')}</span>
						</Link>
					</div>
				</div>
			</main>
		</div>
	)
}
