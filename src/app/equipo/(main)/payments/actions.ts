'use server'

import {
	confirmPaymentReceipt,
	confirmPaymentReceipts,
} from '~/server/mutations'

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
