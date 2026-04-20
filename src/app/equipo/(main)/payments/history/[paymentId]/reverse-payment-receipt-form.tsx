'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import { reversePaymentReceiptConfirmationAction } from '../../actions'

export function ReversePaymentReceiptForm({
	paymentId,
}: {
	paymentId: number
}) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const router = useRouter()
	const [isPending, startTransition] = useTransition()

	return (
		<div className="rounded-lg border bg-card p-4">
			<p className="mb-3 text-muted-foreground text-sm">
				{t('payments-receipt-detail-reverse-help')}
			</p>
			<Button
				type="button"
				variant="outline"
				disabled={isPending}
				onClick={() => {
					startTransition(async () => {
						const res = await reversePaymentReceiptConfirmationAction(paymentId)
						if (res?.error != null) {
							toast.error(resolveError(res.error))
						} else {
							toast.success(t('payments-receipt-detail-reverse-success'))
							router.push('/equipo/payments/history')
							router.refresh()
						}
					})
				}}
			>
				{isPending
					? t('payments-receipt-detail-reversing')
					: t('payments-receipt-detail-reverse')}
			</Button>
		</div>
	)
}
