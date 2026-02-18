/**
 * Fixtures for app applications review E2E tests (Phase 3: agents review/authorize/reject).
 */

export const agentForReview = {
	name: 'Agent Review',
	email: 'agent.review@example.com',
	roles: ['agent', 'requests'] as const,
}

export const applicantForReview = {
	name: 'Applicant For Review',
	email: 'applicant.review@reviewcompany.com',
	roles: ['applicant'] as const,
}

export const companyForReview = {
	name: 'E2E Review Company',
	domain: 'reviewcompany.com',
	rate: '0.0250',
	borrowingCapacityRate: '0.30',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}
