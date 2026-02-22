/**
 * Fixtures for app applications review E2E tests (Phase 3: agents review/authorize/reject).
 *
 * Single source of truth — the batch seed task in cypress/tasks imports from here.
 */

// ── Users ───────────────────────────────────────────────────────────────

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
export const applicantA2 = {
	name: 'Applicant A2',
	email: 'applicant.a2@reviewcompany.com',
	roles: ['applicant'] as const,
}
export const applicantA3 = {
	name: 'Applicant A3',
	email: 'applicant.a3@reviewcompany.com',
	roles: ['applicant'] as const,
}
export const applicantA4 = {
	name: 'Applicant A4',
	email: 'applicant.a4@reviewcompany.com',
	roles: ['applicant'] as const,
}
export const applicantA5 = {
	name: 'Applicant A5',
	email: 'applicant.a5@reviewcompany.com',
	roles: ['applicant'] as const,
}

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

// ── Companies ───────────────────────────────────────────────────────────

type CompanyFixture = {
	name: string
	domain: string
	rate: string
	borrowingCapacityRate: string | null
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
	active: boolean
}

export const companyForReview: CompanyFixture = {
	name: 'E2E Review Company',
	domain: 'reviewcompany.com',
	rate: '0.0250',
	borrowingCapacityRate: '0.30',
	employeeSalaryFrequency: 'monthly',
	active: true,
}

/** Second company for cross-company 404 test; agent is assigned to it. */
export const companyForReviewB: CompanyFixture = {
	name: 'Other Company',
	domain: 'othercompany.com',
	rate: '0.02',
	borrowingCapacityRate: null,
	employeeSalaryFrequency: 'monthly',
	active: true,
}

/** Company with no agent assignments – only admin (all scope) can see. */
export const companyForReviewC: CompanyFixture = {
	name: 'Admin-Only Company',
	domain: 'adminonly.com',
	rate: '0.02',
	borrowingCapacityRate: null,
	employeeSalaryFrequency: 'monthly',
	active: true,
}

/** Inactive company – not in picker; cookie cleared if selected. */
export const companyForReviewD: CompanyFixture = {
	name: 'Inactive Company',
	domain: 'inactivecompany.com',
	rate: '0.02',
	borrowingCapacityRate: null,
	employeeSalaryFrequency: 'monthly',
	active: false,
}

// ── Seed configuration (imported by cypress/tasks seed) ─────────────────

export const allReviewApplicants = [
	applicantForReview,
	applicantA2,
	applicantA3,
	applicantA4,
	applicantA5,
	applicantForReviewB,
	applicantForReviewC,
	applicantForReviewD,
]

export const allReviewCompanies = [
	companyForReview,
	companyForReviewB,
	companyForReviewC,
	companyForReviewD,
]

/** Domains of companies the agent is assigned to. */
export const agentCompanyDomains = [
	companyForReview.domain,
	companyForReviewB.domain,
	companyForReviewD.domain,
]

/** One entry per application to seed. */
export const reviewApplicationConfigs = [
	{
		applicantEmail: applicantForReview.email,
		companyDomain: companyForReview.domain,
		creditAmount: '25000',
		salaryAtApplication: '40000',
	},
	{
		applicantEmail: applicantA2.email,
		companyDomain: companyForReview.domain,
		creditAmount: '30000',
		salaryAtApplication: '40000',
	},
	{
		applicantEmail: applicantA3.email,
		companyDomain: companyForReview.domain,
		creditAmount: '35000',
		salaryAtApplication: '40000',
	},
	{
		applicantEmail: applicantA4.email,
		companyDomain: companyForReview.domain,
		creditAmount: '40000',
		salaryAtApplication: '40000',
	},
	{
		applicantEmail: applicantA5.email,
		companyDomain: companyForReview.domain,
		creditAmount: '45000',
		salaryAtApplication: '40000',
	},
	{
		applicantEmail: applicantForReviewB.email,
		companyDomain: companyForReviewB.domain,
		creditAmount: '15000',
		salaryAtApplication: '40000',
	},
	{
		applicantEmail: applicantForReviewC.email,
		companyDomain: companyForReviewC.domain,
		creditAmount: '8000',
		salaryAtApplication: '40000',
	},
	{
		applicantEmail: applicantForReviewD.email,
		companyDomain: companyForReviewD.domain,
		creditAmount: '5000',
		salaryAtApplication: '40000',
	},
]
