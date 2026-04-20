'use server'

import { formatPendingPaymentReceiptsCsv } from '~/lib/format-pending-payment-receipts-csv'
import {
	canConfirmReceiptQueueInstallment,
	isPaymentsOverdueQueueInstallment,
} from '~/lib/payment-confirmation'
import { getAbility, subject } from '~/server/auth/ability'
import {
	confirmInstallmentReceipt,
	confirmInstallments,
	type ValidateInstallmentsCsvResult,
	validateInstallmentsCsv,
} from '~/server/mutations'
import { getInstallmentsForQueue } from '~/server/queries'
import {
	getEffectiveCompanyScope,
	getEffectiveSelectedCompanyId,
} from '~/server/scopes'

export type ConfirmInstallmentState = {
	error?: string
	ok?: true
} | null

export async function confirmInstallmentAction(
	paymentId: number,
): Promise<ConfirmInstallmentState> {
	const result = await confirmInstallmentReceipt(paymentId)
	if (result.error != null) {
		return { error: result.error }
	}
	return { ok: true }
}

export async function confirmInstallmentsAction(
	paymentIds: number[],
): Promise<ConfirmInstallmentState> {
	const result = await confirmInstallments(paymentIds)
	if (result.error != null) {
		return { error: result.error }
	}
	return { ok: true }
}

export type ValidateInstallmentsCsvActionResult =
	| ({ ok: true } & ValidateInstallmentsCsvResult & { fileName: string })
	| { ok: false; error: string }

export async function validateInstallmentsCsvAction(
	formData: FormData,
): Promise<ValidateInstallmentsCsvActionResult> {
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
	const result = await validateInstallmentsCsv(csvContent, selectedCompanyId)
	return { ok: true, ...result, fileName: file.name }
}

export async function confirmInstallmentsFromCsvAction(
	paymentIds: number[],
): Promise<ConfirmInstallmentState> {
	const result = await confirmInstallments(paymentIds)
	if (result.error != null) {
		return { error: result.error }
	}
	return { ok: true }
}

export async function exportPendingInstallmentsCsvAction(): Promise<
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
		queue: 'installments',
	})
	const today = new Date()
	const pendingReceipt = installments.filter(
		(row) =>
			canConfirmReceiptQueueInstallment(row) &&
			!isPaymentsOverdueQueueInstallment(
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
