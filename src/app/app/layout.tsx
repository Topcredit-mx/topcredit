import { eq } from 'drizzle-orm'
import { AgentNoAssignmentsEmpty } from '~/components/app/agent-no-assignments-empty'
import { AppSidebar } from '~/components/app/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar'
import { getRequiredAgentUser } from '~/server/auth/lib'
import { db } from '~/server/db'
import { users } from '~/server/db/schema'
import {
	getCompaniesForSwitcher,
	getEffectiveSelectedCompanyId,
} from '~/server/scopes'

export default async function AppLayout({
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
	const [companies, selectedCompanyId] = await Promise.all([
		getCompaniesForSwitcher(user.id, isAdmin),
		getEffectiveSelectedCompanyId(),
	])

	const showNoAssignmentsEmpty = !isAdmin && companies.length === 0

	return (
		<SidebarProvider>
			<AppSidebar
				user={{ ...user, emailVerified }}
				companies={companies}
				selectedCompanyId={selectedCompanyId}
			/>
			<main className="flex flex-1 flex-col">
				<header className="border-b">
					<div className="flex h-16 items-center gap-4 px-6">
						<SidebarTrigger />
					</div>
				</header>
				<div className="flex-1 overflow-y-auto bg-gray-50 p-8">
					{showNoAssignmentsEmpty ? <AgentNoAssignmentsEmpty /> : children}
				</div>
			</main>
		</SidebarProvider>
	)
}
