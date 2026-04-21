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
	const isAdmin = user.roles?.includes('admin')
	const disableNav = !isAdmin && companies.length === 0

	const roles = user.roles ?? []

	const navigationItems: NavItem[] = isAdmin
		? [
				{ title: t('nav-home'), url: '/equipo', icon: Home },
				{ title: t('nav-users'), url: '/equipo/users', icon: Users },
				{
					title: t('nav-companies'),
					url: '/equipo/companies',
					icon: Building2,
				},
				{
					title: t('nav-data'),
					url: '/equipo/data',
					icon: FileText,
					items: [
						{ title: t('nav-requests'), url: '/equipo/applications' },
						{ title: t('nav-credits'), url: '/equipo/credits' },
					],
				},
				{
					title: t('nav-installments'),
					url: '/equipo/installments',
					icon: CreditCard,
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
		: [
				{ title: t('nav-home'), url: '/equipo', icon: Home },
				{ title: t('nav-credits'), url: '/equipo/credits', icon: CreditCard },
				...(roles.includes('requests')
					? [
							{
								title: t('nav-requests'),
								url: '/equipo/applications?status=pending',
								icon: FileText,
							},
						]
					: []),
				...(roles.includes('pre-authorizations')
					? [
							{
								title: t('nav-pre-authorizations'),
								url: '/equipo/applications?status=approved',
								icon: CheckSquare,
							},
						]
					: []),
				...(roles.includes('authorizations')
					? [
							{
								title: t('nav-authorizations'),
								url: '/equipo/applications?status=awaiting-authorization',
								icon: ShieldCheck,
							},
						]
					: []),
				...(roles.includes('hr')
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
				...(roles.includes('installments')
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
				...(roles.includes('dispersions')
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
