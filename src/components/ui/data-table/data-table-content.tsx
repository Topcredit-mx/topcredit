'use client'

import { flexRender } from '@tanstack/react-table'
import { cn } from '~/lib/utils'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '../table'
import { useDataTable } from './use-data-table'

export function DataTableContent<TData>({
	variant = 'default',
	wrapperClassName,
	headerRowClassName,
	headCellClassName,
	bodyRowClassName,
	bodyCellClassName,
}: {
	/** Matches equipo credits list table chrome when set. */
	variant?: 'default' | 'equipoCredits'
	wrapperClassName?: string
	headerRowClassName?: string
	headCellClassName?: string
	bodyRowClassName?: string
	bodyCellClassName?: string
} = {}) {
	const { table, columnsLength, emptyMessage } = useDataTable<TData>()
	const isCredits = variant === 'equipoCredits'
	const rowCount = table.getRowModel().rows.length
	if (rowCount === 0 && emptyMessage !== undefined && emptyMessage !== '') {
		return (
			<div
				className={cn(
					'min-w-0 rounded-md border py-12 text-center text-muted-foreground text-sm',
					wrapperClassName,
				)}
			>
				{emptyMessage}
			</div>
		)
	}
	return (
		<div className={cn('min-w-0 rounded-md border', wrapperClassName)}>
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow
							key={headerGroup.id}
							className={cn(
								isCredits &&
									'border-slate-100 border-b bg-slate-50/80 hover:bg-slate-50/80',
								headerRowClassName,
							)}
						>
							{headerGroup.headers.map((header) => {
								return (
									<TableHead
										key={header.id}
										className={cn(
											isCredits &&
												'h-auto px-5 py-3 text-left align-middle text-[11px] text-muted-foreground uppercase tracking-wide',
											headCellClassName,
										)}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								)
							})}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row) => (
							<TableRow
								key={row.id}
								data-state={row.getIsSelected() && 'selected'}
								className={cn(
									isCredits &&
										'border-slate-100 border-b last:border-0 hover:bg-slate-50/50',
									bodyRowClassName,
								)}
							>
								{row.getVisibleCells().map((cell) => (
									<TableCell
										key={cell.id}
										className={cn(
											isCredits && 'px-5 py-3.5',
											bodyCellClassName,
										)}
									>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell
								colSpan={columnsLength}
								className="h-24 text-center text-muted-foreground"
							>
								No results.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	)
}
