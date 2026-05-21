'use client'

import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { ymdForDeductionSchedule } from '~/lib/calendar-date-tz'
import { getValidFirstDiscountDates } from '~/lib/first-discount-date'
import { formatMxDate } from '~/lib/format-mx-date'

type ExportPayrollQueueCsvDialogProps = {
	open: boolean
	onClose: () => void
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
	companyName: string
	fileNamePrefix: string
	titleKey:
		| 'deductions-export-dialog-title'
		| 'installments-export-dialog-title'
	successKey: 'deductions-export-success' | 'installments-export-success'
	errorKey: 'deductions-export-error' | 'installments-export-error'
	onExport: (
		selectedDate: string,
	) => Promise<{ csv: string } | { error: string }>
}

export function ExportPayrollQueueCsvDialog({
	open,
	onClose,
	employeeSalaryFrequency,
	companyName,
	fileNamePrefix,
	titleKey,
	successKey,
	errorKey,
	onExport,
}: ExportPayrollQueueCsvDialogProps) {
	const t = useTranslations('equipo')
	const [isPending, startTransition] = useTransition()

	const validDates = getValidFirstDiscountDates(
		employeeSalaryFrequency,
		new Date(),
		6,
	).map((d) => ymdForDeductionSchedule(d))

	const firstDate = validDates[0]
	const [selectedDate, setSelectedDate] = useState<string>(firstDate ?? '')

	function handleClose() {
		onClose()
	}

	function handleExport() {
		if (!selectedDate) return
		startTransition(async () => {
			const result = await onExport(selectedDate)
			if ('error' in result) {
				toast.error(t(errorKey))
				return
			}
			const blob = new Blob([result.csv], { type: 'text/csv' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			const slug = companyName.replace(/\s+/g, '-').toLowerCase() || 'empresa'
			a.download = `${fileNamePrefix}-${slug}-${selectedDate}.csv`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
			toast.success(t(successKey))
			handleClose()
		})
	}

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
			<DialogContent aria-describedby={undefined}>
				<DialogHeader>
					<DialogTitle>{t(titleKey)}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<label
							htmlFor="export-payroll-queue-date"
							className="font-medium text-sm"
						>
							{t('queue-export-date-label')}
						</label>
						<select
							id="export-payroll-queue-date"
							value={selectedDate}
							onChange={(e) => setSelectedDate(e.target.value)}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
						>
							{validDates.map((date) => (
								<option key={date} value={date}>
									{formatMxDate(date, { month: 'long' })}
								</option>
							))}
						</select>
					</div>
				</div>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={handleClose}
						disabled={isPending}
					>
						{t('queue-export-cancel')}
					</Button>
					<Button
						type="button"
						onClick={handleExport}
						disabled={isPending || !selectedDate}
					>
						{isPending ? t('queue-export-loading') : t('queue-export-confirm')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
