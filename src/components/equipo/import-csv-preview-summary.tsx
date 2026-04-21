'use client'

import { FileText, Info, ListOrdered, TableProperties } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DialogDescription } from '~/components/ui/dialog'
import { cn } from '~/lib/utils'
import type { CsvImportParseStats } from '~/server/mutations'

type ImportCsvVariant = 'deductions' | 'installments'

export function ImportCsvPreviewSummary({
	id,
	variant,
	fileName,
	parseStats,
	className,
}: {
	id: string
	variant: ImportCsvVariant
	fileName: string
	parseStats: CsvImportParseStats
	className?: string
}) {
	const t = useTranslations('equipo')

	const fileLabel =
		variant === 'deductions'
			? t('deductions-import-stats-file', { fileName })
			: t('installments-import-stats-file', { fileName })
	const totalLabel =
		variant === 'deductions'
			? t('deductions-import-stats-total-rows', {
					count: parseStats.totalDataRows,
				})
			: t('installments-import-stats-total-rows', {
					count: parseStats.totalDataRows,
				})
	const parseOkLabel =
		variant === 'deductions'
			? t('deductions-import-stats-parse-ok', {
					count: parseStats.validParsedRowCount,
				})
			: t('installments-import-stats-parse-ok', {
					count: parseStats.validParsedRowCount,
				})
	const hint =
		variant === 'deductions'
			? t('deductions-import-stats-hint')
			: t('installments-import-stats-hint')

	return (
		<DialogDescription id={id} asChild>
			<div
				className={cn(
					'space-y-3 rounded-lg border bg-muted/40 p-3 text-sm',
					className,
				)}
			>
				<div className="flex items-start gap-2.5">
					<FileText
						className="mt-0.5 size-4 shrink-0 text-muted-foreground"
						aria-hidden
					/>
					<span className="min-w-0 break-all font-medium text-foreground">
						{fileLabel}
					</span>
				</div>
				<div className="flex items-start gap-2.5">
					<ListOrdered
						className="mt-0.5 size-4 shrink-0 text-muted-foreground"
						aria-hidden
					/>
					<span className="text-muted-foreground">{totalLabel}</span>
				</div>
				<div className="flex items-start gap-2.5">
					<TableProperties
						className="mt-0.5 size-4 shrink-0 text-muted-foreground"
						aria-hidden
					/>
					<span className="text-muted-foreground">{parseOkLabel}</span>
				</div>
				<p className="flex gap-2 border-border/60 border-t pt-2 text-muted-foreground text-xs leading-relaxed">
					<Info className="mt-0.5 size-3.5 shrink-0 opacity-80" aria-hidden />
					{hint}
				</p>
			</div>
		</DialogDescription>
	)
}
