'use server'

import { confirmHrDeductions } from '~/server/mutations'
import {
	getOverdueDeductionsForCredit,
	type OverdueDeductionInstallment,
} from '~/server/queries'
import { getEffectiveSelectedCompanyId } from '~/server/scopes'

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

export async function getOverdueDeductionsForCreditAction(
	creditId: number,
): Promise<OverdueDeductionInstallment[] | { error: string }> {
	const selectedCompanyId = await getEffectiveSelectedCompanyId()
	if (selectedCompanyId === null) {
		return { error: 'no-company-selected' }
	}
	return getOverdueDeductionsForCredit(creditId, selectedCompanyId)
}
