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

export const companyWithTerms: CompanyFixture = {
	name: 'E2E Credits Company',
	domain: 'example.com',
	rate: '0.0250',
	borrowingCapacityRate: '0.30',
	employeeSalaryFrequency: 'monthly',
	active: true,
}

export const companyWithoutCapacityRate: CompanyFixture = {
	name: 'E2E No Rate Company',
	domain: 'norate.com',
	rate: '0.0250',
	borrowingCapacityRate: null,
	employeeSalaryFrequency: 'monthly',
	active: true,
}

export const applicantNoCompany = {
	name: 'Applicant No Company',
	email: 'orphan@nocompany.org',
	roles: ['applicant'] as const,
}

export const applicantWithCompanyWithoutCapacityRate = {
	name: 'Applicant Missing Capacity Rate',
	email: 'norate@norate.com',
	roles: ['applicant'] as const,
}

export const companyWithoutTermOfferings: CompanyFixture = {
	name: 'E2E No Terms Company',
	domain: 'noterms.com',
	rate: '0.0250',
	borrowingCapacityRate: '0.30',
	employeeSalaryFrequency: 'monthly',
	active: true,
}

export const applicantWithCompanyWithoutTermOfferings = {
	name: 'Applicant Missing Terms',
	email: 'user@noterms.com',
	roles: ['applicant'] as const,
}

export const companyInactive: CompanyFixture = {
	name: 'E2E Inactive Company',
	domain: 'inactive-application.com',
	rate: '0.0250',
	borrowingCapacityRate: '0.30',
	employeeSalaryFrequency: 'monthly',
	active: false,
}

export const applicantInactiveCompany = {
	name: 'Applicant Inactive Company',
	email: 'inactive@inactive-application.com',
	roles: ['applicant'] as const,
}
