'use client'

import {
	Banknote,
	Building2,
	CalendarClock,
	CheckSquare,
	CreditCard,
	FileText,
	History,
	Home,
	ShieldCheck,
	TriangleAlert,
	UserCheck,
	Users,
	Wallet,
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

interface AgentSidebarProps {
	user: {
		name?: string | null
		email?: string | null
		roles?: string[]
		emailVerified?: boolean
	}
	companies: CompanyForSwitcher[]
	selectedCompanyId: number | null
	overdueDeductionsCount?: number
	overdueInstallmentsCount?: number
}

export function AgentSidebar({
	user,
	companies,
	selectedCompanyId,
	overdueDeductionsCount = 0,
	overdueInstallmentsCount = 0,
}: AgentSidebarProps) {
	const t = useTranslations('equipo')
	const isAdmin = user.roles?.includes('admin') ?? false
	const disableNav = !isAdmin && companies.length === 0

	const roles = user.roles ?? []
	const canAccess = (role: string) => isAdmin || roles.includes(role)

	const adminNavigationItems: NavItem[] = isAdmin
		? [
				{ title: t('nav-admin-users'), url: '/equipo/users', icon: Users },
				{
					title: t('nav-admin-companies'),
					url: '/equipo/companies',
					icon: Building2,
				},
				{
					title: t('nav-admin-credits-defaulted'),
					url: '/equipo/credits/defaulted',
					icon: Wallet,
				},
			]
		: []

	const navigationItems: NavItem[] = [
		{ title: t('nav-home'), url: '/equipo', icon: Home },
		{ title: t('nav-credits'), url: '/equipo/credits', icon: CreditCard },
		...(canAccess('requests')
			? [
					{
						title: t('nav-requests'),
						url: '/equipo/applications?status=pending',
						icon: FileText,
					},
				]
			: []),
		...(canAccess('pre-authorizations')
			? [
					{
						title: t('nav-pre-authorizations'),
						url: '/equipo/applications?status=approved',
						icon: CheckSquare,
					},
				]
			: []),
		...(canAccess('authorizations')
			? [
					{
						title: t('nav-authorizations'),
						url: '/equipo/applications?status=awaiting-authorization',
						icon: ShieldCheck,
					},
				]
			: []),
		...(canAccess('hr')
			? [
					{
						title: t('nav-hr'),
						url: '/equipo/applications?status=authorized&hrPending=true',
						icon: UserCheck,
					},
					{
						title: t('nav-hr-deductions'),
						url: '/equipo/deductions',
						icon: Wallet,
						items: [
							{
								title: t('nav-deductions-next-cutoff'),
								url: '/equipo/deductions',
								icon: CalendarClock,
								exact: true,
							},
							{
								title: t('nav-deductions-history'),
								url: '/equipo/deductions/history',
								icon: History,
							},
							{
								title: t('nav-deductions-overdue'),
								url: '/equipo/deductions/overdue',
								icon: TriangleAlert,
								badge:
									overdueDeductionsCount > 0
										? overdueDeductionsCount
										: undefined,
							},
						],
					},
				]
			: []),
		...(canAccess('installments')
			? [
					{
						title: t('nav-installments'),
						url: '/equipo/installments',
						icon: Banknote,
						items: [
							{
								title: t('nav-installments-next-cutoff'),
								url: '/equipo/installments',
								icon: CalendarClock,
								exact: true,
							},
							{
								title: t('nav-installments-history'),
								url: '/equipo/installments/history',
								icon: History,
							},
							{
								title: t('nav-installments-overdue'),
								url: '/equipo/installments/overdue',
								icon: TriangleAlert,
								badge:
									overdueInstallmentsCount > 0
										? overdueInstallmentsCount
										: undefined,
							},
						],
					},
				]
			: []),
		...(canAccess('dispersions')
			? [
					{
						title: t('nav-dispersions'),
						url: '/equipo/applications?status=authorized&disbursementPending=true',
						icon: Banknote,
					},
				]
			: []),
	]

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
								<Link href="/equipo">
									<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
										<Building2 className="size-4" />
									</div>
									<div className="grid flex-1 text-left text-sm leading-tight">
										<span className="truncate font-semibold">
											{t('brand-name')}
										</span>
										<span className="truncate text-xs">
											{t('brand-tagline')}
										</span>
									</div>
								</Link>
							</SidebarMenuButton>
						)}
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent className="min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0">
				<div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
					<NavMain
						items={navigationItems}
						disabled={disableNav}
						groupLabel={t('navigation')}
					/>
				</div>
				{adminNavigationItems.length > 0 ? (
					<div className="shrink-0 border-sidebar-border border-t">
						<NavMain
							items={adminNavigationItems}
							disabled={disableNav}
							groupLabel={t('nav-admin')}
						/>
					</div>
				) : null}
			</SidebarContent>

			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
