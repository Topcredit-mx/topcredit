/**
 * Fixtures for dashboard applications E2E tests.
 * Applicant email domain must match company domain (e.g. applicant@example.com → company domain example.com).
 */

export const applicantWithCompany = {
	name: 'Applicant With Company',
	email: 'applicant@example.com',
	roles: ['applicant'] as const,
}

export const applicantB = {
	name: 'Applicant B',
	email: 'applicantb@example.com',
	roles: ['applicant'] as const,
}

type CompanyFixture = {
	name: string
	domain: string
	rate: string
	borrowingCapacityRate: string | null
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
	active: boolean
}

/** Company with domain matching applicant@example.com and applicantb@example.com (example.com) */
export const companyWithTerms: CompanyFixture = {
	name: 'E2E Credits Company',
	domain: 'example.com',
	rate: '0.0250',
	borrowingCapacityRate: '0.30',
	employeeSalaryFrequency: 'monthly',
	active: true,
}

/** Active company missing borrowingCapacityRate; applicant submission is still allowed. */
export const companyWithoutCapacityRate: CompanyFixture = {
	name: 'E2E No Rate Company',
	domain: 'norate.com',
	rate: '0.0250',
	borrowingCapacityRate: null,
	employeeSalaryFrequency: 'monthly',
	active: true,
}

/** Applicant whose email domain has no company */
export const applicantNoCompany = {
	name: 'Applicant No Company',
	email: 'orphan@nocompany.org',
	roles: ['applicant'] as const,
}

/** Applicant whose active company is missing borrowingCapacityRate. */
export const applicantWithCompanyWithoutCapacityRate = {
	name: 'Applicant Missing Capacity Rate',
	email: 'norate@norate.com',
	roles: ['applicant'] as const,
}

/** Active company with no term offerings; applicant submission is still allowed. */
export const companyWithoutTermOfferings: CompanyFixture = {
	name: 'E2E No Terms Company',
	domain: 'noterms.com',
	rate: '0.0250',
	borrowingCapacityRate: '0.30',
	employeeSalaryFrequency: 'monthly',
	active: true,
}

/** Applicant whose active company has no term offerings. */
export const applicantWithCompanyWithoutTermOfferings = {
	name: 'Applicant Missing Terms',
	email: 'user@noterms.com',
	roles: ['applicant'] as const,
}

/** Inactive company - applicant should be blocked */
export const companyInactive: CompanyFixture = {
	name: 'E2E Inactive Company',
	domain: 'inactive-application.com',
	rate: '0.0250',
	borrowingCapacityRate: '0.30',
	employeeSalaryFrequency: 'monthly',
	active: false,
}

/** Applicant whose company is inactive */
export const applicantInactiveCompany = {
	name: 'Applicant Inactive Company',
	email: 'inactive@inactive-application.com',
	roles: ['applicant'] as const,
}
