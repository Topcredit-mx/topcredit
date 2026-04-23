export const dispersionsAgent = {
	name: 'Dispersions Agent',
	email: 'dispersions.agent@disbcompany.com',
	roles: ['agent', 'dispersions'] as const,
}

export const nonDispersionsAgent = {
	name: 'Non-Dispersions Agent',
	email: 'other.agent@disbcompany.com',
	roles: ['agent', 'authorizations'] as const,
}

export const applicantForDisb = {
	name: 'Disb Applicant',
	email: 'applicant@disbcompany.com',
	roles: ['applicant'] as const,
}

export const hrPendingApplicant = {
	name: 'HR Pending Applicant',
	email: 'hr.pending.applicant@disbcompany.com',
	roles: ['applicant'] as const,
}

export const allDisbUsers = [
	dispersionsAgent,
	nonDispersionsAgent,
	applicantForDisb,
	hrPendingApplicant,
]

export const disbCompany = {
	name: 'Disbursement E2E Company',
	domain: 'disbcompany.com',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}
