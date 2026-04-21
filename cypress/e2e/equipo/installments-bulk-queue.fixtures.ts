/** Isolated seed domain for “many pending receipts” E2E (20 queue rows). */
export const PAYMENTS_BULK_QUEUE_COUNT = 20

export const installmentsBulkQueueCompany = {
	name: 'Payments Bulk Queue E2E',
	domain: 'paymentsbulk.com',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}

export const installmentsBulkAgent = {
	name: 'Installments Bulk Agent',
	email: 'installments.bulk@paymentsbulk.com',
	roles: ['agent', 'installments'] as const,
}

export const installmentsBulkHrAgent = {
	name: 'HR Bulk Agent',
	email: 'hr.bulk@paymentsbulk.com',
	roles: ['agent', 'hr'] as const,
}

export const installmentsBulkApplicants = Array.from(
	{ length: PAYMENTS_BULK_QUEUE_COUNT },
	(_, i) => ({
		name: `Bulk Employee ${i + 1}`,
		email: `bulk-applicant-${String(i + 1).padStart(2, '0')}@paymentsbulk.com`,
		roles: ['applicant'] as const,
	}),
)

export const allInstallmentsBulkQueueUsers = [
	installmentsBulkAgent,
	installmentsBulkHrAgent,
	...installmentsBulkApplicants,
]
