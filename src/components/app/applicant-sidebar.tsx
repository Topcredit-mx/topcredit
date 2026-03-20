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
import { shell } from '~/lib/shell'
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

function isCuentaHomeActive(pathname: string) {
	return pathname === '/cuenta'
}

function isNewApplicationActive(pathname: string) {
	return pathname === '/cuenta/applications/new'
}

function isMySolicitudesActive(pathname: string) {
	if (pathname === '/cuenta/applications/new') {
		return false
	}
	return (
		pathname === '/cuenta/applications' ||
		/^\/cuenta\/applications\/\d+$/.test(pathname)
	)
}

function isMyLoansActive(pathname: string) {
	return pathname === '/cuenta/loans'
}

function isSupportActive(pathname: string) {
	return pathname === '/cuenta/support'
}

export function ApplicantSidebar({ user }: ApplicantSidebarProps) {
	const tCuenta = useTranslations('cuenta')
	const pathname = usePathname()
	const { setOpenMobile } = useSidebar()

	const closeMobileMenu = () => {
		setOpenMobile(false)
	}

	const navItems: ApplicantNavItem[] = [
		{
			title: tCuenta('nav-home'),
			url: '/cuenta',
			icon: Home,
			isActive: isCuentaHomeActive,
		},
		{
			title: tCuenta('nav-new-application'),
			url: '/cuenta/applications/new',
			icon: FilePlus2,
			isActive: isNewApplicationActive,
		},
		{
			title: tCuenta('nav-my-solicitudes'),
			url: '/cuenta/applications',
			icon: ClipboardList,
			isActive: isMySolicitudesActive,
		},
		{
			title: tCuenta('nav-my-loans'),
			url: '/cuenta/loans',
			icon: Landmark,
			isActive: isMyLoansActive,
		},
		{
			title: tCuenta('nav-support'),
			url: '/cuenta/support',
			icon: CircleHelp,
			isActive: isSupportActive,
		},
	]

	return (
		<Sidebar
			collapsible="none"
			sheetContentClassName={cn(
				'border-0 text-foreground',
				shell.applicantCanvas,
			)}
			className="border-r-0 bg-transparent px-2 py-4 text-foreground md:px-3 md:py-6"
		>
			<SidebarHeader className="p-2 pb-5">
				<Link
					href="/cuenta"
					onClick={closeMobileMenu}
					className="block px-2 py-1"
				>
					<p className="font-semibold text-brand text-lg leading-tight">
						{tCuenta('brand-name')}
					</p>
					<p className="mt-1.5 text-[10px] text-slate-500 uppercase leading-snug tracking-[0.2em]">
						{tCuenta('applicant-portal-tagline')}
					</p>
				</Link>
			</SidebarHeader>
			{/* Horizontal padding so active `box-shadow` isn’t clipped: `overflow-y-auto` forces overflow-x to clip. */}
			<SidebarContent className="min-h-0 flex-1 gap-0 overflow-y-auto px-2 pb-2 md:px-2.5">
				<nav aria-label={tCuenta('nav-aria')} className="flex flex-col">
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
												: 'rounded-xl text-slate-600 hover:bg-slate-200/60 hover:text-slate-900',
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
				<NavUser user={user} settingsBasePath="/cuenta/settings" />
			</SidebarFooter>
		</Sidebar>
	)
}
