'use server'

import {
	confirmHrDeduction,
	confirmPaymentReceipt,
	reversePaymentReceiptConfirmation,
} from '~/server/mutations'

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

export type PaymentReceiptFromCreditState = {
	error?: string
	ok?: true
} | null

export async function confirmPaymentReceiptFromCreditAction(
	paymentId: number,
): Promise<PaymentReceiptFromCreditState> {
	const result = await confirmPaymentReceipt(paymentId)
	if (result.error != null) {
		return { error: result.error }
	}
	return { ok: true }
}

export async function reversePaymentReceiptFromCreditAction(
	paymentId: number,
): Promise<PaymentReceiptFromCreditState> {
	const result = await reversePaymentReceiptConfirmation(paymentId)
	if (result.error != null) {
		return { error: result.error }
	}
	return { ok: true }
}
