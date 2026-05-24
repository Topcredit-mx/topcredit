import { eq } from 'drizzle-orm'
import { AgentNoAssignmentsEmpty } from '~/components/app/agent-no-assignments-empty'
import { AgentSidebar } from '~/components/app/agent-sidebar'
import { EquipoGlobalSearchDialog } from '~/components/app/equipo-global-search-dialog'
import { AccessDeniedScreen } from '~/components/auth/access-denied-screen'
import { BackgroundJobTrackerShell } from '~/components/background-jobs/background-job-tracker-shell'
import { BreadcrumbNav } from '~/components/breadcrumb-nav'
import { SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar'
import { requireAuth } from '~/server/auth/session'
import { getActiveBackgroundJobsForUser } from '~/server/background-jobs'
import { db } from '~/server/db'
import { users } from '~/server/db/schema'
import {
	getOverdueDeductionsCount,
	getOverdueInstallmentsCount,
} from '~/server/queries'
import {
	getCompaniesForSwitcher,
	getEffectiveSelectedCompanyId,
} from '~/server/scopes'

export default async function AppMainLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const session = await requireAuth()
	const user = session.user
	if (!user.roles.includes('agent')) {
		return <AccessDeniedScreen />
	}

	const dbUser = await db.query.users.findFirst({
		where: eq(users.id, user.id),
		columns: { emailVerified: true },
	})
	const emailVerified = dbUser?.emailVerified != null
	const isAdmin = user.roles?.includes('admin') ?? false
	const hasHrAccess = isAdmin || (user.roles?.includes('hr') ?? false)
	const hasPaymentsAccess =
		isAdmin || (user.roles?.includes('installments') ?? false)
	const [companies, selectedCompanyId, activeBackgroundJobs] =
		await Promise.all([
			getCompaniesForSwitcher(user.id, isAdmin),
			getEffectiveSelectedCompanyId(),
			getActiveBackgroundJobsForUser(user.id),
		])

	const overdueDeductionsCount =
		hasHrAccess && selectedCompanyId !== null
			? await getOverdueDeductionsCount(selectedCompanyId)
			: 0

	const overdueInstallmentsCount =
		hasPaymentsAccess && selectedCompanyId !== null
			? await getOverdueInstallmentsCount(selectedCompanyId)
			: 0

	const showNoAssignmentsEmpty = !isAdmin && companies.length === 0

	return (
		<BackgroundJobTrackerShell initialJobs={activeBackgroundJobs}>
			<SidebarProvider>
				<AgentSidebar
					user={{ ...user, emailVerified }}
					companies={companies}
					selectedCompanyId={selectedCompanyId}
					overdueDeductionsCount={overdueDeductionsCount}
					overdueInstallmentsCount={overdueInstallmentsCount}
				/>
				<main className="flex min-w-0 flex-1 flex-col">
					<header className="border-b">
						<div className="flex h-14 min-h-14 items-center justify-between gap-4 px-6">
							<div className="flex min-w-0 items-center gap-4">
								<SidebarTrigger />
								<BreadcrumbNav scope="equipo" />
							</div>
							{!showNoAssignmentsEmpty ? <EquipoGlobalSearchDialog /> : null}
						</div>
					</header>
					<div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 px-8 pt-0 pb-8">
						{showNoAssignmentsEmpty ? <AgentNoAssignmentsEmpty /> : children}
					</div>
				</main>
			</SidebarProvider>
		</BackgroundJobTrackerShell>
	)
}
