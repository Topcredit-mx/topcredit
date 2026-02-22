'use client'

import { Building2, ChevronsUpDown, LayoutDashboard } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { SidebarMenuButton } from '~/components/ui/sidebar'
import { cn } from '~/lib/utils'
import { setSelectedCompanyId } from '~/server/mutations'
import type { CompanyForSwitcher } from '~/server/scopes'

type CompanySwitcherProps = {
	companies: CompanyForSwitcher[]
	selectedCompanyId: number | null
	isAdmin?: boolean
}

function companyInitials(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean)
	if (words.length === 0) return '??'
	const first = words[0] as string
	if (words.length >= 2) {
		const second = words[1] as string
		return (first.charAt(0) + second.charAt(0)).toUpperCase()
	}
	return first.slice(0, 2).toUpperCase()
}

export function CompanySwitcher({
	companies,
	selectedCompanyId,
	isAdmin = false,
}: CompanySwitcherProps) {
	const t = useTranslations('admin')
	const router = useRouter()
	const selectedCompany = companies.find((c) => c.id === selectedCompanyId)
	const noSelectionLabel = isAdmin
		? t('switcher-overview')
		: t('switcher-all-my-companies')

	async function onSelectCompany(companyId: number) {
		await setSelectedCompanyId(companyId)
		router.refresh()
	}

	async function onSelectOverview() {
		await setSelectedCompanyId(null)
		router.refresh()
	}

	if (companies.length === 0 && !isAdmin) return null

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<SidebarMenuButton size="lg" aria-label={t('switcher-select-company')}>
					<div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
						<Building2 className="size-4" />
					</div>
					<div className="min-w-0 flex-1 text-left text-sm">
						<span className="truncate font-semibold">
							{selectedCompanyId === null
								? noSelectionLabel
								: (selectedCompany?.name ?? 'TopCredit')}
						</span>
					</div>
					<ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
				</SidebarMenuButton>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="min-w-56"
				align="start"
				side="right"
				sideOffset={8}
			>
				<DropdownMenuItem onSelect={onSelectOverview} className="gap-2">
					<div
						className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted font-medium text-muted-foreground text-xs"
						aria-hidden
					>
						<LayoutDashboard className="size-4" />
					</div>
					<span className="truncate">{noSelectionLabel}</span>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuLabel className="font-normal text-muted-foreground text-xs">
					{t('switcher-companies')}
				</DropdownMenuLabel>
				{companies.map((company) => (
					<DropdownMenuItem
						key={company.id}
						disabled={!company.active}
						onSelect={() => onSelectCompany(company.id)}
						className="gap-2"
					>
						<div
							className={cn(
								'flex size-8 shrink-0 items-center justify-center rounded-md font-medium text-xs',
								company.active
									? 'bg-sidebar-primary text-sidebar-primary-foreground'
									: 'bg-muted text-muted-foreground',
							)}
							aria-hidden
						>
							{companyInitials(company.name)}
						</div>
						<span className="truncate">
							{company.name}
							{!company.active && t('switcher-inactive')}
						</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
