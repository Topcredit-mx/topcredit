'use server'

import { confirmHrDeductions } from '~/server/mutations'

export type ConfirmHrDeductionsState = {
	error?: string
	confirmed?: true
} | null

export async function confirmHrDeductionsAction(
	paymentIds: number[],
): Promise<ConfirmHrDeductionsState> {
	const result = await confirmHrDeductions(paymentIds)
	if (result.error != null) {
		return { error: result.error }
	}
	return { confirmed: true }
}
