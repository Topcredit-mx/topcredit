import { eq } from 'drizzle-orm'
import { AgentNoAssignmentsEmpty } from '~/components/app/agent-no-assignments-empty'
import { AgentSidebar } from '~/components/app/agent-sidebar'
import { BreadcrumbNav } from '~/components/breadcrumb-nav'
import { SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar'
import { getRequiredAgentUser } from '~/server/auth/session'
import { db } from '~/server/db'
import { users } from '~/server/db/schema'
import {
	getOverdueDeductionsCount,
	getOverduePaymentsCount,
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
	const user = await getRequiredAgentUser()
	const dbUser = await db.query.users.findFirst({
		where: eq(users.id, user.id),
		columns: { emailVerified: true },
	})
	const emailVerified = dbUser?.emailVerified != null
	const isAdmin = user.roles?.includes('admin') ?? false
	const hasHrAccess = isAdmin || (user.roles?.includes('hr') ?? false)
	const hasPaymentsAccess =
		isAdmin || (user.roles?.includes('payments') ?? false)
	const [companies, selectedCompanyId] = await Promise.all([
		getCompaniesForSwitcher(user.id, isAdmin),
		getEffectiveSelectedCompanyId(),
	])

	const overdueDeductionsCount =
		hasHrAccess && selectedCompanyId !== null
			? await getOverdueDeductionsCount(selectedCompanyId)
			: 0

	const overduePaymentReceiptsCount =
		hasPaymentsAccess && selectedCompanyId !== null
			? await getOverduePaymentsCount(selectedCompanyId)
			: 0

	const showNoAssignmentsEmpty = !isAdmin && companies.length === 0

	return (
		<SidebarProvider>
			<AgentSidebar
				user={{ ...user, emailVerified }}
				companies={companies}
				selectedCompanyId={selectedCompanyId}
				overdueDeductionsCount={overdueDeductionsCount}
				overduePaymentReceiptsCount={overduePaymentReceiptsCount}
			/>
			<main className="flex min-w-0 flex-1 flex-col">
				<header className="border-b">
					<div className="flex h-14 min-h-14 items-center gap-4 px-6">
						<SidebarTrigger />
						<BreadcrumbNav scope="equipo" />
					</div>
				</header>
				<div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 px-8 pt-0 pb-8">
					{showNoAssignmentsEmpty ? <AgentNoAssignmentsEmpty /> : children}
				</div>
			</main>
		</SidebarProvider>
	)
}
