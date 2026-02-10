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
import { useTranslations } from 'next-intl'
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
		emailVerified?: boolean
	}
	companies: CompanyForSwitcher[]
	selectedCompanyId: number | null
}

export function AppSidebar({
	user,
	companies,
	selectedCompanyId,
}: AppSidebarProps) {
	const t = useTranslations('app')
	const isAdmin = user.roles?.includes('admin')
	const disableNav =
		!isAdmin && companies.length > 0 && selectedCompanyId === null

	const navigationItems: NavItem[] = [
		{
			title: t('nav-dashboard'),
			url: '/app',
			icon: Home,
		},
		{
			title: t('nav-users'),
			url: '/app/users',
			icon: Users,
		},
		{
			title: t('nav-companies'),
			url: '/app/companies',
			icon: Building2,
		},
		{
			title: t('nav-data'),
			url: '/app/data',
			icon: FileText,
			items: [
				{ title: t('nav-requests'), url: '/app/applications' },
				{ title: t('nav-credits'), url: '/app/credits' },
			],
		},
		{
			title: t('nav-payments'),
			url: '/app/payments',
			icon: CreditCard,
		},
	]

	// Add admin section if user is admin
	if (isAdmin) {
		navigationItems.push({
			title: t('nav-admin'),
			url: '/app/admin',
			icon: Shield,
			items: [
				{ title: t('nav-admin-users'), url: '/app/admin/users' },
				{ title: t('nav-admin-companies'), url: '/app/admin/companies' },
			],
		})
	}

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						{companies.length > 0 || isAdmin ? (
							<CompanySwitcher
								companies={companies}
								selectedCompanyId={selectedCompanyId}
								isAdmin={isAdmin}
							/>
						) : (
							<SidebarMenuButton size="lg" asChild>
								<Link href="/app">
									<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
										<Building2 className="size-4" />
									</div>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-semibold">{t('brand-name')}</span>
										<span className="truncate text-xs">{t('brand-tagline')}</span>
									</div>
								</Link>
							</SidebarMenuButton>
						)}
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				<NavMain
				items={navigationItems}
				disabled={disableNav}
				groupLabel={t('navigation')}
			/>
			</SidebarContent>

			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
