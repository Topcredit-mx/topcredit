'use client'

import {
	Building2,
	CreditCard,
	FileText,
	Home,
	Shield,
	Users,
} from 'lucide-react'
import Link from 'next/link'
import { CompanySwitcher } from '~/components/app/company-switcher'
import { type NavItem, NavMain } from '~/components/nav-main'
import { NavUser } from '~/components/nav-user'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from '~/components/ui/sidebar'
import type { CompanyForSwitcher } from '~/server/scopes'

interface AppSidebarProps {
	user: {
		name?: string | null
		email?: string | null
		roles?: string[]
	}
	companies: CompanyForSwitcher[]
	selectedCompanyId: number | null
}

export function AppSidebar({
	user,
	companies,
	selectedCompanyId,
}: AppSidebarProps) {
	const isAdmin = user.roles?.includes('admin')

	const navigationItems: NavItem[] = [
		{
			title: 'Dashboard',
			url: '/app',
			icon: Home,
		},
		{
			title: 'Usuarios',
			url: '/app/users',
			icon: Users,
		},
		{
			title: 'Empresas',
			url: '/app/companies',
			icon: Building2,
		},
		{
			title: 'Datos',
			url: '/app/data',
			icon: FileText,
			items: [
				{ title: 'Solicitudes', url: '/app/applications' },
				{ title: 'Créditos', url: '/app/credits' },
			],
		},
		{
			title: 'Pagos',
			url: '/app/payments',
			icon: CreditCard,
		},
	]

	// Add admin section if user is admin
	if (isAdmin) {
		navigationItems.push({
			title: 'Administración',
			url: '/app/admin',
			icon: Shield,
			items: [
				{ title: 'Usuarios', url: '/app/admin/users' },
				{ title: 'Empresas', url: '/app/admin/companies' },
			],
		})
	}

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						{companies.length > 0 ? (
							<CompanySwitcher
								companies={companies}
								selectedCompanyId={selectedCompanyId}
							/>
						) : (
							<SidebarMenuButton size="lg" asChild>
								<Link href="/app">
									<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
										<Building2 className="size-4" />
									</div>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-semibold">TopCredit</span>
										<span className="truncate text-xs">Admin Dashboard</span>
									</div>
								</Link>
							</SidebarMenuButton>
						)}
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				<NavMain items={navigationItems} />
			</SidebarContent>

			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
