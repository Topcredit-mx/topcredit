import { AppSidebar } from '~/components/app/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar'
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
	const isAdmin = user.roles?.includes('admin') ?? false
	const [companies, selectedCompanyId] = await Promise.all([
		getCompaniesForSwitcher(user.id, isAdmin),
		getSelectedCompanyId(),
	])

	return (
		<SidebarProvider>
			<AppSidebar
				user={user}
				companies={companies}
				selectedCompanyId={selectedCompanyId}
			/>
			<main className="flex flex-1 flex-col">
				<header className="border-b">
					<div className="flex h-16 items-center gap-4 px-6">
						<SidebarTrigger />
					</div>
				</header>
				<div className="flex-1 overflow-y-auto bg-gray-50 p-8">{children}</div>
			</main>
		</SidebarProvider>
	)
}
