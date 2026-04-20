'use server'

import { confirmHrDeduction, confirmPaymentReceipt } from '~/server/mutations'

export type ConfirmDeductionFromCreditState = {
	error?: string
	confirmed?: true
} | null

export async function confirmHrDeductionFromCreditAction(
	paymentId: number,
): Promise<ConfirmDeductionFromCreditState> {
	const result = await confirmHrDeduction(paymentId)
	if (result.error != null) {
		return { error: result.error }
	}
	return { confirmed: true }
}

export type ConfirmPaymentReceiptFromCreditState = {
	error?: string
	confirmed?: true
} | null

export async function confirmPaymentReceiptFromCreditAction(
	paymentId: number,
): Promise<ConfirmPaymentReceiptFromCreditState> {
	const result = await confirmPaymentReceipt(paymentId)
	if (result.error != null) {
		return { error: result.error }
	}
	return { confirmed: true }
}
