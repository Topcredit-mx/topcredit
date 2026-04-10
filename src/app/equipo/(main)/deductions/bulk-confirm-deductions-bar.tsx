'use client'

import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { Button } from '~/components/ui/button'
import { useDataTable } from '~/components/ui/data-table'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { InstallmentForQueue } from '~/server/queries'
import { confirmHrDeductionsAction } from './actions'

type ActionResult =
	| { error: string }
	| { confirmed: true; count: number }
	| null

export function BulkConfirmDeductionsBar() {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const [isPending, startTransition] = useTransition()
	const [result, setResult] = useState<ActionResult>(null)

	const { table } = useDataTable<InstallmentForQueue>()
	const selectedRows = table.getFilteredSelectedRowModel().rows
	const count = selectedRows.length

	if (count === 0 && result === null) return null

	function handleConfirm() {
		const paymentIds = selectedRows.map((row) => row.original.id)
		setResult(null)
		startTransition(async () => {
			const res = await confirmHrDeductionsAction(paymentIds)
			if (res?.error != null) {
				setResult({ error: res.error })
			} else {
				setResult({ confirmed: true, count: paymentIds.length })
				table.resetRowSelection()
			}
		})
	}

	const buttonLabel =
		count === 1
			? t('deductions-bulk-confirm-one')
			: t('deductions-bulk-confirm-many', { count })

	return (
		<div className="flex items-center gap-3 py-2">
			{count > 0 && (
				<Button size="sm" disabled={isPending} onClick={handleConfirm}>
					{buttonLabel}
				</Button>
			)}
			{result !== null && 'confirmed' in result && (
				<p className="text-green-700 text-sm">
					{result.count === 1
						? t('deductions-bulk-confirm-success-one')
						: t('deductions-bulk-confirm-success-many', {
								count: result.count,
							})}
				</p>
			)}
			{result !== null && 'error' in result && (
				<p className="text-destructive text-sm">{resolveError(result.error)}</p>
			)}
		</div>
	)
}
