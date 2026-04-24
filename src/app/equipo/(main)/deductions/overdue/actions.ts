'use server'

import { confirmHrDeductions } from '~/server/mutations'

export type ConfirmOverdueDeductionsState = {
	error?: string
	confirmed?: true
} | null

export async function confirmOverdueDeductionsAction(
	paymentIds: number[],
): Promise<ConfirmOverdueDeductionsState> {
	const result = await confirmHrDeductions(paymentIds)
	if (result.error != null) {
		return { error: result.error }
	}
	return { confirmed: true }
}
