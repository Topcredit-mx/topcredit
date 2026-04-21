'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { useDataTable } from '~/components/ui/data-table'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { OverdueInstallment } from '~/server/queries'
import { confirmInstallmentsAction } from '../actions'

export function OverdueInstallmentsBulkBar() {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const router = useRouter()
	const [isConfirmPending, startConfirmTransition] = useTransition()

	const { table } = useDataTable<OverdueInstallment>()
	const selectedRows = table.getFilteredSelectedRowModel().rows
	const count = selectedRows.length

	function handleConfirm() {
		const paymentIds = selectedRows.map((row) => row.original.id)
		startConfirmTransition(async () => {
			const res = await confirmInstallmentsAction(paymentIds)
			if (res?.error != null) {
				toast.error(resolveError(res.error))
			} else {
				toast.success(
					paymentIds.length === 1
						? t('installments-bulk-confirm-success-one')
						: t('installments-bulk-confirm-success-many', {
								count: paymentIds.length,
							}),
				)
				table.resetRowSelection()
				router.refresh()
			}
		})
	}

	const confirmLabel =
		count === 1
			? t('installments-bulk-confirm-one')
			: t('installments-bulk-confirm-many', { count })

	return (
		<div className="flex min-w-0 flex-wrap items-center justify-end gap-2 py-2">
			{count > 0 ? (
				<Button
					type="button"
					size="sm"
					disabled={isConfirmPending}
					onClick={handleConfirm}
				>
					{confirmLabel}
				</Button>
			) : null}
		</div>
	)
}
