'use client'

import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import {
	DataTable,
	DataTableContent,
	DataTablePagination,
} from '~/components/ui/data-table'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { OverdueDeduction } from '~/server/queries'
import { confirmOverdueDeductionsAction } from './actions'
import { useOverdueDeductionsColumns } from './columns'
import { ConfirmOverdueDialog } from './confirm-overdue-dialog'

export function OverdueDeductionsTable({
	deductions,
}: {
	deductions: OverdueDeduction[]
}) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const [, startTransition] = useTransition()
	const [dialogDeduction, setDialogDeduction] =
		useState<OverdueDeduction | null>(null)
	const [successMessage, setSuccessMessage] = useState<string | null>(null)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	const handleConfirm = (deduction: OverdueDeduction) => {
		setSuccessMessage(null)
		setErrorMessage(null)

		if (deduction.overdueCount > 1) {
			setDialogDeduction(deduction)
			return
		}

		startTransition(async () => {
			const result = await confirmOverdueDeductionsAction([deduction.id])
			if (result?.error != null) {
				setErrorMessage(result.error)
			} else {
				setSuccessMessage(t('overdue-deductions-confirm-success'))
			}
		})
	}

	const handleDialogClose = () => {
		setDialogDeduction(null)
	}

	const columns = useOverdueDeductionsColumns(handleConfirm)

	return (
		<div className="space-y-2">
			<DataTable
				columns={columns}
				data={deductions}
				schema="overdue-deductions"
			>
				<DataTableContent />
				<DataTablePagination />
			</DataTable>
			{successMessage !== null && (
				<p className="text-green-700 text-sm">{successMessage}</p>
			)}
			{errorMessage !== null && (
				<p className="text-destructive text-sm">{resolveError(errorMessage)}</p>
			)}
			<ConfirmOverdueDialog
				deduction={dialogDeduction}
				onClose={handleDialogClose}
			/>
		</div>
	)
}
