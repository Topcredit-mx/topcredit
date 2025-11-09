'use client'

import { Building2, CreditCard, FileText, Home, Users } from 'lucide-react'
import Link from 'next/link'
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

interface AppSidebarProps {
	user: {
		name?: string | null
		email?: string | null
		roles?: string[]
	}
}

export function AppSidebar({ user }: AppSidebarProps) {
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

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
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
