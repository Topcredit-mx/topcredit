'use client'

import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { FormattedDate } from '~/components/formatted-date'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '~/components/ui/dialog'
import { Label } from '~/components/ui/label'
import { formatCurrencyMxn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type {
	OverdueDeduction,
	OverdueDeductionInstallment,
} from '~/server/queries'
import {
	confirmOverdueDeductionsAction,
	getOverdueDeductionsForCreditAction,
} from './actions'

interface ConfirmOverdueDialogProps {
	deduction: OverdueDeduction | null
	onClose: () => void
}

export function ConfirmOverdueDialog({
	deduction,
	onClose,
}: ConfirmOverdueDialogProps) {
	const t = useTranslations('equipo')
	const tCommon = useTranslations('common')
	const resolveError = useResolveValidationError()
	const [isPending, startTransition] = useTransition()
	const [installments, setInstallments] = useState<
		OverdueDeductionInstallment[]
	>([])
	const [selectedIds, setSelectedIds] = useState<number[]>([])

	useEffect(() => {
		if (deduction === null) {
			setInstallments([])
			setSelectedIds([])
			return
		}

		startTransition(async () => {
			const result = await getOverdueDeductionsForCreditAction(
				deduction.creditId,
			)
			if ('error' in result) {
				toast.error(resolveError(result.error))
				onClose()
				return
			}
			setInstallments(result)
			setSelectedIds(result.map((i) => i.id))
		})
	}, [deduction, onClose, resolveError])

	const handleToggle = (id: number) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		)
	}

	const handleConfirm = () => {
		if (selectedIds.length === 0) return
		startTransition(async () => {
			const result = await confirmOverdueDeductionsAction(selectedIds)
			if (result?.error != null) {
				toast.error(resolveError(result.error))
				return
			}
			onClose()
		})
	}

	const handleOpenChange = (open: boolean) => {
		if (!open) onClose()
	}

	return (
		<Dialog open={deduction !== null} onOpenChange={handleOpenChange}>
			<DialogContent aria-describedby={undefined}>
				<DialogHeader>
					<DialogTitle>
						{deduction !== null
							? t('overdue-deductions-confirm-dialog-title', {
									name: deduction.employeeName,
								})
							: ''}
					</DialogTitle>
					{deduction !== null && (
						<DialogDescription>
							{t('overdue-deductions-confirm-dialog-description', {
								count: deduction.overdueCount,
							})}
						</DialogDescription>
					)}
				</DialogHeader>

				<div className="max-h-[300px] space-y-3 overflow-y-auto py-2">
					{installments.map((installment) => (
						<div key={installment.id} className="flex items-center space-x-3">
							<Checkbox
								id={`installment-${installment.id}`}
								checked={selectedIds.includes(installment.id)}
								onCheckedChange={() => handleToggle(installment.id)}
								disabled={isPending}
							/>
							<Label
								htmlFor={`installment-${installment.id}`}
								className="flex flex-1 cursor-pointer items-center justify-between"
							>
								<span>
									<FormattedDate value={installment.dueDate} format="date" />
								</span>
								<span className="font-medium">
									{formatCurrencyMxn(installment.amount)}
								</span>
							</Label>
						</div>
					))}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose} disabled={isPending}>
						{tCommon('cancel')}
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={isPending || selectedIds.length === 0}
					>
						{isPending ? (
							<Loader2 className="mr-2 size-4 animate-spin" />
						) : null}
						{t('overdue-deductions-confirm-selected')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
