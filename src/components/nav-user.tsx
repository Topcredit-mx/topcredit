'use client'

import {
	AlertTriangle,
	ChevronsUpDown,
	KeyRound,
	LogOut,
	User,
} from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { authSignOut } from '~/client/auth'
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

export interface NavUserProps {
	user: {
		name?: string | null
		email?: string | null
		image?: string | null
		emailVerified?: boolean
	}
}

export function NavUser({ user }: NavUserProps) {
	const t = useTranslations('app')
	const tCommon = useTranslations('common')
	const { isMobile } = useSidebar()
	const showUnverifiedWarning = user.emailVerified === false

	const handleLogout = async () => {
		await authSignOut({ callbackUrl: '/login' })
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				{showUnverifiedWarning && (
					<div
						role="alert"
						className="mb-2 flex items-start gap-2 rounded-md bg-amber-50 px-2 py-1.5 text-amber-800 text-xs"
					>
						<AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
						<span>
							{t('email-unverified')}{' '}
							<Link
								href="/settings/security"
								className="font-medium underline underline-offset-1"
							>
								{t('verify')}
							</Link>
						</span>
					</div>
				)}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							id="nav-user-menu-trigger"
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="size-8 rounded-lg">
								<AvatarImage
									src={user.image || undefined}
									alt={user.name || ''}
								/>
								<AvatarFallback className="rounded-lg">
									{user.name?.charAt(0).toUpperCase() || 'U'}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">{user.name}</span>
								<span className="truncate text-xs">{user.email}</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						side={isMobile ? 'bottom' : 'right'}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="size-8 rounded-lg">
									<AvatarImage
										src={user.image || undefined}
										alt={user.name || ''}
									/>
									<AvatarFallback className="rounded-lg">
										{user.name?.charAt(0).toUpperCase() || 'U'}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">{user.name}</span>
									<span className="truncate text-xs">{user.email}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Link
								href="/settings/profile"
								className="flex cursor-pointer items-center gap-2"
							>
								<User className="size-4" />
								{t('footer-profile')}
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<Link
								href="/settings/security"
								className="flex cursor-pointer items-center gap-2"
							>
								<KeyRound className="size-4" />
								{t('footer-authentication')}
							</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleLogout}>
							<LogOut />
							{tCommon('sign-out')}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
