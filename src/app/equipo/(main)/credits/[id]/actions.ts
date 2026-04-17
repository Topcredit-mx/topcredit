'use server'

import { confirmHrDeduction } from '~/server/mutations'

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
