'use server'

import { formatPendingPaymentReceiptsCsv } from '~/lib/format-pending-payment-receipts-csv'
import { canConfirmReceiptQueueInstallment } from '~/lib/payment-confirmation'
import { getAbility, subject } from '~/server/auth/ability'
import {
	confirmPaymentReceipt,
	confirmPaymentReceipts,
} from '~/server/mutations'
import { getInstallmentsForQueue } from '~/server/queries'
import {
	getEffectiveCompanyScope,
	getEffectiveSelectedCompanyId,
} from '~/server/scopes'

export type ConfirmPaymentReceiptState = {
	error?: string
	ok?: true
} | null

export async function confirmPaymentReceiptAction(
	paymentId: number,
): Promise<ConfirmPaymentReceiptState> {
	const result = await confirmPaymentReceipt(paymentId)
	if (result.error != null) {
		return { error: result.error }
	}
	return { ok: true }
}

export async function confirmPaymentReceiptsAction(
	paymentIds: number[],
): Promise<ConfirmPaymentReceiptState> {
	const result = await confirmPaymentReceipts(paymentIds)
	if (result.error != null) {
		return { error: result.error }
	}
	return { ok: true }
}

export async function exportPendingPaymentReceiptsCsvAction(): Promise<
	{ csv: string } | { error: string }
> {
	const { ability, isAdmin, assignedCompanyIds } = await getAbility()

	const firstCompanyId = assignedCompanyIds[0]
	const canExport =
		isAdmin ||
		(firstCompanyId !== undefined &&
			ability.can(
				'confirmPaymentReceipt',
				subject('CreditPayment', { id: 0, companyId: firstCompanyId }),
			))

	if (!canExport) {
		return { error: 'unauthorized' }
	}

	const selectedCompanyId = await getEffectiveSelectedCompanyId()
	if (selectedCompanyId === null) {
		return { error: 'no-company-selected' }
	}

	const scope = await getEffectiveCompanyScope()
	const installments = await getInstallmentsForQueue({
		scope,
		queue: 'payments',
	})
	const pendingReceipt = installments.filter((row) =>
		canConfirmReceiptQueueInstallment(row),
	)

	return { csv: formatPendingPaymentReceiptsCsv(pendingReceipt) }
}
