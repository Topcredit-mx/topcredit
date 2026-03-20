'use client'

import {
	AlertTriangle,
	ChevronsUpDown,
	KeyRound,
	LogOut,
	User,
} from 'lucide-react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'

import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '~/components/ui/sidebar'
import { shell } from '~/lib/shell'
import { cn } from '~/lib/utils'

const DEFAULT_SETTINGS_BASE = '/settings'

const profileMenuItemClass =
	'mx-1 cursor-pointer gap-3 rounded-lg py-2 pr-2 pl-2 text-slate-800 hover:bg-brand/10 focus:bg-brand/10 focus:text-slate-900 [&_svg]:text-brand'

const avatarShellClass = 'size-9 shrink-0 rounded-xl ring-1 ring-slate-200/80'

const avatarFallbackClass = 'rounded-xl bg-brand-soft font-semibold text-brand'

export interface NavUserProps {
	user: {
		name?: string | null
		email?: string | null
		image?: string | null
		emailVerified?: boolean
	}
	/** Profile / security links; use `/cuenta/settings` in applicant sidebar. */
	settingsBasePath?: string
}

export function NavUser({
	user,
	settingsBasePath = DEFAULT_SETTINGS_BASE,
}: NavUserProps) {
	const settingsBase =
		settingsBasePath.replace(/\/$/, '') || DEFAULT_SETTINGS_BASE
	const profileHref = `${settingsBase}/profile`
	const securityHref = `${settingsBase}/security`
	const t = useTranslations('equipo')
	const tCommon = useTranslations('common')
	const { isMobile } = useSidebar()
	const showUnverifiedWarning = user.emailVerified === false

	const handleLogout = async () => {
		await signOut({ callbackUrl: '/login' })
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				{showUnverifiedWarning ? (
					<div
						role="alert"
						className="mb-2 flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-2.5 py-2 text-amber-950 text-xs"
					>
						<AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-700" />
						<span className="leading-snug">
							{t('email-unverified')}{' '}
							<Link
								href={securityHref}
								className="font-semibold text-brand underline decoration-brand/40 underline-offset-2 hover:decoration-brand"
							>
								{t('verify')}
							</Link>
						</span>
					</div>
				) : null}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							id="nav-user-menu-trigger"
							size="lg"
							className={cn(
								'h-auto! min-h-12 rounded-xl border border-slate-200/80 bg-white py-2 pr-2 pl-2 shadow-sm',
								'hover:border-brand/30 hover:bg-brand/5 hover:text-slate-900',
								'data-[state=open]:border-brand/40 data-[state=open]:bg-brand/8 data-[state=open]:text-slate-900',
								'focus-visible:ring-2 focus-visible:ring-brand/25',
							)}
						>
							<Avatar className={avatarShellClass}>
								<AvatarImage
									src={user.image || undefined}
									alt={user.name || ''}
								/>
								<AvatarFallback className={avatarFallbackClass}>
									{user.name?.charAt(0).toUpperCase() || 'U'}
								</AvatarFallback>
							</Avatar>
							<div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold text-slate-900">
									{user.name}
								</span>
								<span className="truncate text-slate-500 text-xs">
									{user.email}
								</span>
							</div>
							<ChevronsUpDown
								className="ml-auto size-4 shrink-0 text-slate-400"
								aria-hidden
							/>
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className={cn(
							shell.elevatedCard,
							'w-[--radix-dropdown-menu-trigger-width] min-w-56 overflow-hidden p-0 text-slate-900',
						)}
						side={isMobile ? 'bottom' : 'right'}
						align="end"
						sideOffset={6}
					>
						<DropdownMenuLabel className="border-slate-100 border-b bg-slate-50/70 p-0 font-normal">
							<div className="flex items-center gap-3 px-3 py-3 text-left text-sm">
								<Avatar className={avatarShellClass}>
									<AvatarImage
										src={user.image || undefined}
										alt={user.name || ''}
									/>
									<AvatarFallback className={avatarFallbackClass}>
										{user.name?.charAt(0).toUpperCase() || 'U'}
									</AvatarFallback>
								</Avatar>
								<div className="grid min-w-0 flex-1 leading-tight">
									<span className="truncate font-semibold text-slate-900">
										{user.name}
									</span>
									<span className="truncate text-slate-500 text-xs">
										{user.email}
									</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<div className="p-1 pt-1">
							<DropdownMenuItem asChild className={profileMenuItemClass}>
								<Link href={profileHref}>
									<User className="size-4" aria-hidden />
									{t('footer-profile')}
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem asChild className={profileMenuItemClass}>
								<Link href={securityHref}>
									<KeyRound className="size-4" aria-hidden />
									{t('footer-authentication')}
								</Link>
							</DropdownMenuItem>
						</div>
						<DropdownMenuSeparator className="bg-slate-200/80" />
						<div className="p-1 pb-1">
							<DropdownMenuItem
								variant="destructive"
								onClick={handleLogout}
								className="mx-1 cursor-pointer gap-3 rounded-lg py-2 pr-2 pl-2 focus:bg-destructive/10"
							>
								<LogOut className="size-4" aria-hidden />
								{tCommon('sign-out')}
							</DropdownMenuItem>
						</div>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
