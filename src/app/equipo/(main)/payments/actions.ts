'use server'

import { formatPendingPaymentReceiptsCsv } from '~/lib/format-pending-payment-receipts-csv'
import {
	canConfirmReceiptQueueInstallment,
	isCalendarOverduePaymentReceiptInstallment,
} from '~/lib/payment-confirmation'
import { getAbility, subject } from '~/server/auth/ability'
import {
	confirmPaymentReceipt,
	confirmPaymentReceipts,
	type ValidatePaymentReceiptsCsvResult,
	validatePaymentReceiptsCsv,
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

export type ValidatePaymentReceiptsCsvActionResult =
	| ({ ok: true } & ValidatePaymentReceiptsCsvResult & { fileName: string })
	| { ok: false; error: string }

export async function validatePaymentReceiptsCsvAction(
	formData: FormData,
): Promise<ValidatePaymentReceiptsCsvActionResult> {
	const { ability, isAdmin, assignedCompanyIds } = await getAbility()

	const firstCompanyId = assignedCompanyIds[0]
	const canImport =
		isAdmin ||
		(firstCompanyId !== undefined &&
			ability.can(
				'confirmPaymentReceipt',
				subject('CreditPayment', { id: 0, companyId: firstCompanyId }),
			))

	if (!canImport) {
		return { ok: false, error: 'unauthorized' }
	}

	const selectedCompanyId = await getEffectiveSelectedCompanyId()
	if (selectedCompanyId === null) {
		return { ok: false, error: 'no-company-selected' }
	}

	const file = formData.get('file')
	if (!(file instanceof File)) {
		return { ok: false, error: 'no-file' }
	}

	const csvContent = await file.text()
	const result = await validatePaymentReceiptsCsv(csvContent, selectedCompanyId)
	return { ok: true, ...result, fileName: file.name }
}

export async function confirmPaymentReceiptsFromCsvAction(
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
	const today = new Date()
	const pendingReceipt = installments.filter(
		(row) =>
			canConfirmReceiptQueueInstallment(row) &&
			!isCalendarOverduePaymentReceiptInstallment(
				{
					dueDate: row.dueDate,
					hrConfirmedAt: row.hrConfirmedAt,
					paymentsConfirmedAt: row.paymentsConfirmedAt,
				},
				today,
			),
	)

	return { csv: formatPendingPaymentReceiptsCsv(pendingReceipt) }
}
