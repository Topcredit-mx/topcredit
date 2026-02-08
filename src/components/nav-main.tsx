'use client'

import { ChevronRight, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback } from 'react'

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '~/components/ui/collapsible'
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from '~/components/ui/sidebar'

export interface NavSubItem {
	title: string
	url: string
}

export interface NavItem {
	title: string
	url: string
	icon?: LucideIcon
	isActive?: boolean
	items?: NavSubItem[]
}

export function NavMain({
	items,
	disabled = false,
}: {
	items: NavItem[]
	disabled?: boolean
}) {
	const pathname = usePathname()

	const isAnySubItemActive = useCallback(
		(subItems?: NavSubItem[]) => {
			if (!subItems) return false
			return subItems.some(
				(subItem) =>
					pathname === subItem.url || pathname.startsWith(`${subItem.url}/`),
			)
		},
		[pathname],
	)

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Navegación</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) =>
					item.items?.length ? (
						<Collapsible
							key={item.title}
							asChild
							defaultOpen={isAnySubItemActive(item.items)}
							className="group/collapsible"
						>
							<SidebarMenuItem>
								<CollapsibleTrigger asChild>
									<SidebarMenuButton
										tooltip={item.title}
										disabled={disabled}
									>
										{item.icon && <item.icon />}
										<span>{item.title}</span>
										<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
									</SidebarMenuButton>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<SidebarMenuSub>
										{item.items?.map((subItem) => (
											<SidebarMenuSubItem key={subItem.title}>
												{disabled ? (
													<SidebarMenuSubButton
														asChild
														isActive={pathname === subItem.url}
														aria-disabled
														className="pointer-events-none opacity-50"
													>
														<span>{subItem.title}</span>
													</SidebarMenuSubButton>
												) : (
													<SidebarMenuSubButton
														asChild
														isActive={pathname === subItem.url}
													>
														<Link href={subItem.url}>{subItem.title}</Link>
													</SidebarMenuSubButton>
												)}
											</SidebarMenuSubItem>
										))}
									</SidebarMenuSub>
								</CollapsibleContent>
							</SidebarMenuItem>
						</Collapsible>
					) : (
						<SidebarMenuItem key={item.title}>
							{disabled ? (
								<SidebarMenuButton
									tooltip={item.title}
									disabled
									isActive={pathname === item.url}
								>
									{item.icon && <item.icon />}
									<span>{item.title}</span>
								</SidebarMenuButton>
							) : (
								<SidebarMenuButton
									tooltip={item.title}
									asChild
									isActive={pathname === item.url}
								>
									<Link href={item.url}>
										{item.icon && <item.icon />}
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
							)}
						</SidebarMenuItem>
					),
				)}
			</SidebarMenu>
		</SidebarGroup>
	)
}
