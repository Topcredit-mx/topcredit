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
import { exportDeductionsCsvAction } from './actions'

interface ExportDeductionsDialogProps {
	open: boolean
	onClose: () => void
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
	companyName: string
}

export function ExportDeductionsDialog({
	open,
	onClose,
	employeeSalaryFrequency,
	companyName,
}: ExportDeductionsDialogProps) {
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
			const result = await exportDeductionsCsvAction(selectedDate)
			if ('error' in result) {
				toast.error(t('deductions-export-error'))
				return
			}
			const blob = new Blob([result.csv], { type: 'text/csv' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `deducciones-${companyName.replace(/\s+/g, '-').toLowerCase()}-${selectedDate}.csv`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
			handleClose()
		})
	}

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
			<DialogContent aria-describedby={undefined}>
				<DialogHeader>
					<DialogTitle>{t('deductions-export-dialog-title')}</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<label
							htmlFor="export-deduction-date"
							className="font-medium text-sm"
						>
							{t('deductions-export-date-label')}
						</label>
						<select
							id="export-deduction-date"
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
						{t('deductions-export-cancel')}
					</Button>
					<Button
						type="button"
						onClick={handleExport}
						disabled={isPending || !selectedDate}
					>
						{isPending
							? t('deductions-export-loading')
							: t('deductions-export-confirm')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
