'use client'

import { useTranslations } from 'next-intl'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { FormattedDate } from '~/components/formatted-date'
import { Button } from '~/components/ui/button'
import { canHrConfirm } from '~/lib/payment-confirmation'
import { formatCurrencyMxn } from '~/lib/utils'
import { useResolveValidationError } from '~/lib/validation-code-to-i18n'
import type { CreditPaymentRowForEquipo } from '~/server/queries'
import { confirmDeductionFromCreditAction } from './actions'

function HrStatusBadge({ hrConfirmedAt }: { hrConfirmedAt: Date | null }) {
	const t = useTranslations('equipo')
	if (hrConfirmedAt !== null) {
		return (
			<span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs">
				{t('credit-detail-hr-status-confirmed')}
			</span>
		)
	}
	return (
		<span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 text-xs">
			{t('credit-detail-hr-status-pending')}
		</span>
	)
}

export function CreditPaymentsTable({
	payments: initialPayments,
	canConfirm,
}: {
	payments: CreditPaymentRowForEquipo[]
	canConfirm: boolean
}) {
	const t = useTranslations('equipo')
	const resolveError = useResolveValidationError()
	const [, startTransition] = useTransition()
	const [payments, setPayments] = useState(initialPayments)

	const handleConfirm = (paymentId: number) => {
		startTransition(async () => {
			const result = await confirmDeductionFromCreditAction(paymentId)
			if (result?.error != null) {
				toast.error(resolveError(result.error))
			} else {
				toast.success(t('credit-detail-confirm-success'))
				setPayments((prev) =>
					prev.map((p) =>
						p.id === paymentId ? { ...p, hrConfirmedAt: new Date() } : p,
					),
				)
			}
		})
	}

	return (
		<table className="w-full">
			<thead>
				<tr className="border-slate-100 border-b bg-slate-50/80 text-left text-[11px] text-slate-500 uppercase tracking-wide">
					<th className="px-5 py-3 font-semibold" scope="col">
						{t('credit-detail-col-number')}
					</th>
					<th className="px-5 py-3 font-semibold" scope="col">
						{t('credit-detail-col-due-date')}
					</th>
					<th className="px-5 py-3 font-semibold" scope="col">
						{t('credit-detail-col-amount')}
					</th>
					<th className="px-5 py-3 font-semibold" scope="col">
						{t('credit-detail-col-hr-status')}
					</th>
					<th className="px-5 py-3" scope="col" />
				</tr>
			</thead>
			<tbody>
				{payments.map((payment, index) => (
					<tr key={payment.id} className="border-slate-100 border-b">
						<td className="px-5 py-3.5 text-slate-800 text-sm">{index + 1}</td>
						<td className="px-5 py-3.5 text-slate-800 text-sm">
							<FormattedDate
								value={payment.dueDate.toISOString()}
								format="date"
							/>
						</td>
						<td className="px-5 py-3.5 text-slate-800 text-sm">
							{formatCurrencyMxn(payment.amount)}
						</td>
						<td className="px-5 py-3.5 text-sm">
							<HrStatusBadge hrConfirmedAt={payment.hrConfirmedAt} />
						</td>
						<td className="px-5 py-3.5">
							{canConfirm && canHrConfirm(payment) && (
								<Button
									size="sm"
									variant="outline"
									onClick={() => handleConfirm(payment.id)}
								>
									{t('credit-detail-confirm')}
								</Button>
							)}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	)
}
