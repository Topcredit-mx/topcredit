'use server'

import { ValidationCode } from '~/lib/validation-codes'
import { liquidateCreditEarlyAsApplicant } from '~/server/mutations'

export type LiquidateCreditFormState = {
	error?: string
	success?: boolean
}

export async function liquidateCreditEarlyAction(
	_prevState: LiquidateCreditFormState,
	formData: FormData,
): Promise<LiquidateCreditFormState> {
	const rawId = formData.get('creditId')
	const creditId =
		typeof rawId === 'string' ? Number.parseInt(rawId, 10) : Number.NaN
	if (!Number.isInteger(creditId) || creditId < 1) {
		return { error: ValidationCode.CREDIT_ID_INVALID }
	}
	const result = await liquidateCreditEarlyAsApplicant(creditId)
	if (result.error) {
		return { error: result.error }
	}
	return { success: true }
}
