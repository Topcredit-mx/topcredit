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

/** Company with no borrowingCapacityRate - applicant should see "company not ready" error */
export const companyNoRate: CompanyFixture = {
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

/** Applicant whose company has no borrowingCapacityRate (norate.com) */
export const applicantNoRate = {
	name: 'Applicant No Rate',
	email: 'norate@norate.com',
	roles: ['applicant'] as const,
}

/** Company with rate and borrowingCapacityRate but no term offerings */
export const companyNoTerms: CompanyFixture = {
	name: 'E2E No Terms Company',
	domain: 'noterms.com',
	rate: '0.0250',
	borrowingCapacityRate: '0.30',
	employeeSalaryFrequency: 'monthly',
	active: true,
}

/** Applicant whose company has no term offerings (noterms.com) */
export const applicantNoTerms = {
	name: 'Applicant No Terms',
	email: 'user@noterms.com',
	roles: ['applicant'] as const,
}
