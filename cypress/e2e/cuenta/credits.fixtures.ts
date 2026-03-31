export const creditsApplicant = {
	name: 'Credits Applicant',
	email: 'credits.applicant@creditscompany.com',
	roles: ['applicant'] as const,
}

export const allCreditsUsers = [creditsApplicant]

export const creditsCompany = {
	name: 'Credits E2E Company',
	domain: 'creditscompany.com',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}
