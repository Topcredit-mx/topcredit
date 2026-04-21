/** Isolated seed domain for many pending installment confirmations E2E (20 queue rows). */
export const INSTALLMENTS_BULK_QUEUE_COUNT = 20

export const installmentsBulkQueueCompany = {
	name: 'Installments Bulk Queue E2E',
	domain: 'installmentsbulk.e2e',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}

export const installmentsBulkAgent = {
	name: 'Installments Bulk Agent',
	email: 'installments.bulk@installmentsbulk.e2e',
	roles: ['agent', 'installments'] as const,
}

export const installmentsBulkHrAgent = {
	name: 'HR Bulk Agent',
	email: 'hr.bulk@installmentsbulk.e2e',
	roles: ['agent', 'hr'] as const,
}

export const installmentsBulkApplicants = Array.from(
	{ length: INSTALLMENTS_BULK_QUEUE_COUNT },
	(_, i) => ({
		name: `Bulk Employee ${i + 1}`,
		email: `bulk-applicant-${String(i + 1).padStart(2, '0')}@installmentsbulk.e2e`,
		roles: ['applicant'] as const,
	}),
)

export const allInstallmentsBulkQueueUsers = [
	installmentsBulkAgent,
	installmentsBulkHrAgent,
	...installmentsBulkApplicants,
]
