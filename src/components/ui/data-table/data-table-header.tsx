'use client'

import { useTranslations } from 'next-intl'
import { Settings2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '../button'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '../dropdown-menu'
import { Input } from '../input'
import { useDataTable } from './use-data-table'

interface DataTableHeaderProps {
	children?: React.ReactNode
	disableCreateButton?: boolean
	className?: string
}

export function DataTableHeader<TData>({
	children,
	disableCreateButton,
	className,
}: DataTableHeaderProps) {
	const {
		table,
		label,
		schema,
		createButtonHref,
		createButtonText,
		filterPlaceholder: contextFilterPlaceholder,
	} = useDataTable<TData>()
	const t = useTranslations('admin')
	const filterPlaceholder =
		contextFilterPlaceholder ?? `Filter ${label ?? schema}...`
	const createLabel =
		createButtonText ?? (label ? `Nuevo ${label}` : `Nuevo ${schema}`)

	return (
		<div
			className={`flex items-center justify-between gap-2 pb-4 ${className}`}
		>
			<div className="flex items-center gap-2">
				<Input
					placeholder={filterPlaceholder}
					onChange={(e) => table.setGlobalFilter(String(e.target.value))}
					className="max-w-xs"
				/>
			</div>
			<div className="flex items-center gap-2">
				{children}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" size="sm">
							<Settings2 />
							{t('table-view')}
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{table
							.getAllColumns()
							.filter((column) => column.getCanHide())
							.map((column) => {
								return (
									<DropdownMenuCheckboxItem
										key={column.id}
										className="capitalize"
										checked={column.getIsVisible()}
										onCheckedChange={(value) =>
											column.toggleVisibility(!!value)
										}
									>
										{column.id}
									</DropdownMenuCheckboxItem>
								)
							})}
					</DropdownMenuContent>
				</DropdownMenu>
				{!disableCreateButton && createButtonHref && (
					<Button size="sm" asChild>
						<Link href={createButtonHref}>{createLabel}</Link>
					</Button>
				)}
			</div>
		</div>
	)
}
