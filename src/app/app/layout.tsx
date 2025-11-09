import { AppSidebar } from '~/components/app/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar'
import { getRequiredEmployeeUser } from '~/server/auth/lib'

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const user = await getRequiredEmployeeUser()

	return (
		<SidebarProvider>
			<AppSidebar user={user} />
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
