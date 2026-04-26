'use server'

import {
	confirmHrDeduction,
	confirmInstallment,
	confirmInstallments,
	defaultCreditAsAdmin,
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

export async function confirmInstallmentsFromCreditAction(
	paymentIds: number[],
): Promise<ConfirmInstallmentFromCreditState> {
	const result = await confirmInstallments(paymentIds)
	if (result.error != null) {
		return { error: result.error }
	}
	return { confirmed: true }
}

export type DefaultCreditFromCreditDetailState = {
	error?: string
	defaulted?: true
} | null

export async function defaultCreditFromCreditDetailAction(
	creditId: number,
): Promise<DefaultCreditFromCreditDetailState> {
	const result = await defaultCreditAsAdmin(creditId)
	if (result.error != null) {
		return { error: result.error }
	}
	return { defaulted: true }
}
