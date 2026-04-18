'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { useDataTable } from '~/components/ui/data-table'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { InstallmentForQueue } from '~/server/queries'
import { confirmPaymentReceiptsAction } from './actions'

export function BulkConfirmPaymentsBar() {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const router = useRouter()
	const [isPending, startTransition] = useTransition()

	const { table } = useDataTable<InstallmentForQueue>()
	const selectedRows = table.getFilteredSelectedRowModel().rows
	const count = selectedRows.length

	function handleConfirm() {
		const paymentIds = selectedRows.map((row) => row.original.id)
		startTransition(async () => {
			const res = await confirmPaymentReceiptsAction(paymentIds)
			if (res?.error != null) {
				toast.error(resolveError(res.error))
			} else {
				toast.success(
					paymentIds.length === 1
						? t('payments-bulk-confirm-success-one')
						: t('payments-bulk-confirm-success-many', {
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
			? t('payments-bulk-confirm-one')
			: t('payments-bulk-confirm-many', { count })

	return (
		<div className="flex flex-wrap items-center justify-end gap-2 py-2">
			{count > 0 ? (
				<Button
					type="button"
					size="sm"
					disabled={isPending}
					onClick={handleConfirm}
				>
					{confirmLabel}
				</Button>
			) : null}
		</div>
	)
}
