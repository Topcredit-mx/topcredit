import { eq } from 'drizzle-orm'
import { AppSidebar } from '~/components/app/app-sidebar'
import { EmployeeNoAssignmentsEmpty } from '~/components/app/employee-no-assignments-empty'
import { EmployeeNoCompanyPickedEmpty } from '~/components/app/employee-no-company-picked-empty'
import { SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar'
import { db } from '~/server/db'
import { users } from '~/server/db/schema'
import { getRequiredEmployeeUser } from '~/server/auth/lib'
import {
	getCompaniesForSwitcher,
	getSelectedCompanyId,
} from '~/server/scopes'

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const user = await getRequiredEmployeeUser()
	const dbUser = await db.query.users.findFirst({
		where: eq(users.id, user.id),
		columns: { emailVerified: true },
	})
	const emailVerified = dbUser?.emailVerified != null
	const isAdmin = user.roles?.includes('admin') ?? false
	const [companies, selectedCompanyId] = await Promise.all([
		getCompaniesForSwitcher(user.id, isAdmin),
		getSelectedCompanyId(),
	])

	const showNoAssignmentsEmpty = !isAdmin && companies.length === 0
	const showNoCompanyPickedEmpty =
		!isAdmin && companies.length > 0 && selectedCompanyId === null

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
					{showNoAssignmentsEmpty ? (
						<EmployeeNoAssignmentsEmpty />
					) : showNoCompanyPickedEmpty ? (
						<EmployeeNoCompanyPickedEmpty />
					) : (
						children
					)}
				</div>
			</main>
		</SidebarProvider>
	)
}
