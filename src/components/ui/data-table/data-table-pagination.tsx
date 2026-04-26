'use client'

import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '../button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../select'
import { useDataTable } from './use-data-table'

export function DataTablePagination<TData>() {
	const t = useTranslations('common')
	const { table, serverPagination } = useDataTable<TData>()
	const selectedCount = table.getFilteredSelectedRowModel().rows.length
	const totalRows = serverPagination
		? serverPagination.totalRowCount
		: table.getFilteredRowModel().rows.length
	const pageIndex = table.getState().pagination.pageIndex
	const pageCount = Math.max(table.getPageCount(), 1)
	const currentPageSize = table.getState().pagination.pageSize
	const pageSizeChoices = [10, 20, 25, 30, 40, 50]
	const pageSizeOptions = [...pageSizeChoices]
	if (!pageSizeChoices.includes(currentPageSize)) {
		pageSizeOptions.push(currentPageSize)
		pageSizeOptions.sort((a, b) => a - b)
	}

	return (
		<div className="flex min-w-0 flex-col gap-3 px-2 py-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-y-2">
			<div className="min-w-0 text-muted-foreground text-sm sm:flex-1">
				{t('data-table-rows-selected', {
					selected: selectedCount,
					total: totalRows,
				})}
			</div>
			<div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end">
				<div className="flex items-center gap-2">
					<p className="text-muted-foreground text-sm">
						{t('data-table-rows-per-page')}
					</p>
					<Select
						value={`${table.getState().pagination.pageSize}`}
						onValueChange={(value) => {
							table.setPageSize(Number(value))
						}}
					>
						<SelectTrigger id="data-table-page-size" className="h-8 w-[70px]">
							<SelectValue placeholder={table.getState().pagination.pageSize} />
						</SelectTrigger>
						<SelectContent side="top">
							{pageSizeOptions.map((pageSize) => (
								<SelectItem key={pageSize} value={`${pageSize}`}>
									{pageSize}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex min-w-[6.5rem] items-center justify-center text-muted-foreground text-sm">
					{t('data-table-page-status', {
						current: pageIndex + 1,
						total: pageCount,
					})}
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						className="hidden size-8 lg:flex"
						title={t('data-table-first-page')}
						onClick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}
					>
						<span className="sr-only">{t('data-table-first-page')}</span>
						<ChevronsLeft />
					</Button>
					<Button
						variant="outline"
						size="icon"
						className="size-8"
						title={t('data-table-previous-page')}
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<span className="sr-only">{t('data-table-previous-page')}</span>
						<ChevronLeft />
					</Button>
					<Button
						variant="outline"
						size="icon"
						className="size-8"
						title={t('data-table-next-page')}
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						<span className="sr-only">{t('data-table-next-page')}</span>
						<ChevronRight />
					</Button>
					<Button
						variant="outline"
						size="icon"
						className="hidden size-8 lg:flex"
						title={t('data-table-last-page')}
						onClick={() => table.setPageIndex(table.getPageCount() - 1)}
						disabled={!table.getCanNextPage()}
					>
						<span className="sr-only">{t('data-table-last-page')}</span>
						<ChevronsRight />
					</Button>
				</div>
			</div>
		</div>
	)
}
