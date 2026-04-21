'use server'

import { confirmHrDeduction, confirmInstallment } from '~/server/mutations'

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

export type ConfirmInstallmentFromCreditState = {
	error?: string
	confirmed?: true
} | null

export async function confirmInstallmentFromCreditAction(
	paymentId: number,
): Promise<ConfirmInstallmentFromCreditState> {
	const result = await confirmInstallment(paymentId)
	if (result.error != null) {
		return { error: result.error }
	}
	return { confirmed: true }
}
