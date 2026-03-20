'use client'

import {
	CircleHelp,
	ClipboardList,
	FilePlus2,
	Home,
	Landmark,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { ComponentType } from 'react'
import { NavUser } from '~/components/nav-user'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	useSidebar,
} from '~/components/ui/sidebar'
import { cn } from '~/lib/utils'

interface ApplicantSidebarProps {
	user: {
		name?: string | null
		email?: string | null
		image?: string | null
		emailVerified?: boolean
	}
}

interface ApplicantNavItem {
	title: string
	url: string
	icon: ComponentType<{ className?: string }>
	isActive: (pathname: string) => boolean
}

function isDashboardHomeActive(pathname: string) {
	return pathname === '/dashboard'
}

function isNewApplicationActive(pathname: string) {
	return pathname === '/dashboard/applications/new'
}

function isMySolicitudesActive(pathname: string) {
	if (pathname === '/dashboard/applications/new') {
		return false
	}
	return (
		pathname === '/dashboard/applications' ||
		/^\/dashboard\/applications\/\d+$/.test(pathname)
	)
}

function isMyLoansActive(pathname: string) {
	return pathname === '/dashboard/loans'
}

function isSupportActive(pathname: string) {
	return pathname.startsWith('/dashboard/settings')
}

export function ApplicantSidebar({ user }: ApplicantSidebarProps) {
	const tApp = useTranslations('app')
	const tDashboard = useTranslations('dashboard')
	const pathname = usePathname()
	const { setOpenMobile } = useSidebar()

	const closeMobileMenu = () => {
		setOpenMobile(false)
	}

	const navItems: ApplicantNavItem[] = [
		{
			title: tDashboard('nav-dashboard'),
			url: '/dashboard',
			icon: Home,
			isActive: isDashboardHomeActive,
		},
		{
			title: tDashboard('nav-new-application'),
			url: '/dashboard/applications/new',
			icon: FilePlus2,
			isActive: isNewApplicationActive,
		},
		{
			title: tDashboard('nav-my-solicitudes'),
			url: '/dashboard/applications',
			icon: ClipboardList,
			isActive: isMySolicitudesActive,
		},
		{
			title: tDashboard('nav-my-loans'),
			url: '/dashboard/loans',
			icon: Landmark,
			isActive: isMyLoansActive,
		},
		{
			title: tDashboard('nav-support'),
			url: '/dashboard/settings',
			icon: CircleHelp,
			isActive: isSupportActive,
		},
	]

	return (
		<Sidebar
			collapsible="none"
			sheetContentClassName="border-0 bg-[#f7f9fb] text-foreground"
			className="border-r-0 bg-transparent px-2 py-4 text-foreground md:px-3 md:py-6"
		>
			<SidebarHeader className="p-2 pb-5">
				<Link
					href="/dashboard"
					onClick={closeMobileMenu}
					className="block px-2 py-1"
				>
					<p className="font-semibold text-brand text-lg leading-tight">
						{tApp('brand-name')}
					</p>
					<p className="mt-1.5 text-[10px] text-slate-500 uppercase leading-snug tracking-[0.2em]">
						{tDashboard('applicant-portal-tagline')}
					</p>
				</Link>
			</SidebarHeader>
			{/* Horizontal padding so active `box-shadow` isn’t clipped: `overflow-y-auto` forces overflow-x to clip. */}
			<SidebarContent className="min-h-0 flex-1 gap-0 overflow-y-auto px-2 pb-2 md:px-2.5">
				<nav aria-label={tDashboard('nav-aria')} className="flex flex-col">
					<SidebarMenu className="gap-0.5">
						{navItems.map((item) => {
							const active = item.isActive(pathname)
							return (
								<SidebarMenuItem key={item.title}>
									<Link
										href={item.url}
										onClick={closeMobileMenu}
										className={cn(
											'flex h-11 w-full min-w-0 items-center gap-3 px-3 text-[0.9375rem] outline-none transition-[background-color,box-shadow,color] duration-200',
											'ring-0 ring-offset-0 focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2',
											active
												? 'rounded-xl bg-white font-semibold text-brand shadow-nav-active'
												: 'rounded-xl text-slate-600 hover:bg-black/4 hover:text-[#191c1e]',
										)}
									>
										<item.icon
											className={cn(
												'size-[18px] shrink-0',
												active ? 'text-brand' : 'text-slate-500',
											)}
											aria-hidden
										/>
										<span className="truncate">{item.title}</span>
									</Link>
								</SidebarMenuItem>
							)
						})}
					</SidebarMenu>
				</nav>
			</SidebarContent>
			<SidebarFooter className="mt-auto p-2 pt-4">
				<NavUser user={user} settingsBasePath="/dashboard/settings" />
			</SidebarFooter>
		</Sidebar>
	)
}
