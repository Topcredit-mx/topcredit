import { BreadcrumbNav } from '~/components/breadcrumb-nav'

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<div className="min-h-screen bg-gray-50">
			<header className="border-b bg-white px-4 py-3 sm:px-6">
				<div className="mx-auto flex max-w-7xl items-center gap-4">
					<BreadcrumbNav scope="dashboard" />
				</div>
			</header>
			{children}
		</div>
	)
}
