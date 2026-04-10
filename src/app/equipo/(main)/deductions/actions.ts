'use server'

import { isValidFirstDiscountDate } from '~/lib/first-discount-date'
import { formatDeductionsCsv } from '~/lib/format-deductions-csv'
import { getAbility, subject } from '~/server/auth/ability'
import { confirmHrDeductions } from '~/server/mutations'
import { getCompanyById, getInstallmentsForQueue } from '~/server/queries'
import {
	getEffectiveCompanyScope,
	getEffectiveSelectedCompanyId,
} from '~/server/scopes'

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

export async function exportDeductionsCsvAction(
	upcomingDeductionDate: string,
): Promise<{ csv: string } | { error: string }> {
	const { ability, isAdmin, assignedCompanyIds } = await getAbility()

	const firstCompanyId = assignedCompanyIds[0]
	const canExport =
		isAdmin ||
		(firstCompanyId !== undefined &&
			ability.can(
				'confirmHrDeduction',
				subject('CreditPayment', { id: 0, companyId: firstCompanyId }),
			))

	if (!canExport) {
		return { error: 'unauthorized' }
	}

	const selectedCompanyId = await getEffectiveSelectedCompanyId()
	if (selectedCompanyId === null) {
		return { error: 'no-company-selected' }
	}

	const company = await getCompanyById(selectedCompanyId)
	if (company === null) {
		return { error: 'company-not-found' }
	}

	const today = new Date()
	const chosenDate = new Date(upcomingDeductionDate)
	if (
		!isValidFirstDiscountDate(
			company.employeeSalaryFrequency,
			chosenDate,
			today,
		)
	) {
		return { error: 'invalid-date' }
	}

	const scope = await getEffectiveCompanyScope()
	const installments = await getInstallmentsForQueue({
		scope,
		queue: 'deductions',
		upcomingDeductionDate,
	})

	return { csv: formatDeductionsCsv(installments) }
}
