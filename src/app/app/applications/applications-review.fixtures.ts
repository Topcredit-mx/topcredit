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

/** One applicant per application – no applicant has multiple active applications. */
export const applicantA2 = { name: 'Applicant A2', email: 'applicant.a2@reviewcompany.com', roles: ['applicant'] as const }
export const applicantA3 = { name: 'Applicant A3', email: 'applicant.a3@reviewcompany.com', roles: ['applicant'] as const }
export const applicantA4 = { name: 'Applicant A4', email: 'applicant.a4@reviewcompany.com', roles: ['applicant'] as const }
export const applicantA5 = { name: 'Applicant A5', email: 'applicant.a5@reviewcompany.com', roles: ['applicant'] as const }

export const applicantForReviewB = {
	name: 'Applicant Other Company',
	email: 'applicant.review@othercompany.com',
	roles: ['applicant'] as const,
}

/** Company with no agent assignments – only admin (all scope) can see its applications. */
export const applicantForReviewC = {
	name: 'Applicant Admin-Only Company',
	email: 'applicant.review@adminonly.com',
	roles: ['applicant'] as const,
}

/** Inactive company – applications hidden, not in picker. */
export const applicantForReviewD = {
	name: 'Applicant Inactive Company',
	email: 'applicant.review@inactivecompany.com',
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
