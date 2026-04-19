/** Isolated seed domain for “many pending receipts” E2E (20 queue rows). */
export const PAYMENTS_BULK_QUEUE_COUNT = 20

export const paymentsBulkQueueCompany = {
	name: 'Payments Bulk Queue E2E',
	domain: 'paymentsbulk.com',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}

export const paymentsBulkPaymentsAgent = {
	name: 'Payments Bulk Agent',
	email: 'payments.bulk@paymentsbulk.com',
	roles: ['agent', 'payments'] as const,
}

export const paymentsBulkHrAgent = {
	name: 'HR Bulk Agent',
	email: 'hr.bulk@paymentsbulk.com',
	roles: ['agent', 'hr'] as const,
}

export const paymentsBulkApplicants = Array.from(
	{ length: PAYMENTS_BULK_QUEUE_COUNT },
	(_, i) => ({
		name: `Bulk Employee ${i + 1}`,
		email: `bulk-applicant-${String(i + 1).padStart(2, '0')}@paymentsbulk.com`,
		roles: ['applicant'] as const,
	}),
)

export const allPaymentsBulkQueueUsers = [
	paymentsBulkPaymentsAgent,
	paymentsBulkHrAgent,
	...paymentsBulkApplicants,
]
