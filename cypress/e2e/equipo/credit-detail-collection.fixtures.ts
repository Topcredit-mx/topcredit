export const creditDetailCollectionCompany = {
	name: 'Credit Detail Collection E2E Co',
	domain: 'credit-detail-collection.e2e',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}

export const creditDetailCollectionPaymentsAgent = {
	name: 'Payments Agent Credit Collection',
	email: 'payments@credit-detail-collection.e2e',
	roles: ['agent', 'payments'] as const,
}

export const creditDetailCollectionHrOnlyAgent = {
	name: 'HR Only Agent Credit Collection',
	email: 'hr.only@credit-detail-collection.e2e',
	roles: ['agent', 'hr'] as const,
}

export const creditDetailCollectionApplicant = {
	name: 'Applicant Credit Collection',
	email: 'applicant@credit-detail-collection.e2e',
	roles: ['applicant'] as const,
}

export const allCreditDetailCollectionUsers = [
	creditDetailCollectionPaymentsAgent,
	creditDetailCollectionHrOnlyAgent,
	creditDetailCollectionApplicant,
]
