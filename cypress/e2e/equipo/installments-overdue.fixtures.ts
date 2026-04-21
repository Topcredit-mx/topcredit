export const installmentsOverdueAgent = {
	name: 'Installments Overdue Agent',
	email: 'installments.overdue@installmentsoverdue.e2e',
	roles: ['agent', 'installments'] as const,
}

export const hrOverdueInstallmentsAgent = {
	name: 'HR Overdue Installments Agent',
	email: 'hr.overdue@installmentsoverdue.e2e',
	roles: ['agent', 'hr'] as const,
}

export const nonInstallmentsOverdueAgent = {
	name: 'Authz Overdue Installments Agent',
	email: 'authz.overdue@installmentsoverdue.e2e',
	roles: ['agent', 'authorizations'] as const,
}

export const applicantOverdueInstallmentsBlocked = {
	name: 'Applicant Overdue Installments Blocked',
	email: 'applicant.overdue@installmentsoverdue.e2e',
	roles: ['applicant'] as const,
}

export const applicantOverdueHrPending = {
	name: 'Applicant Overdue HR Pending',
	email: 'applicant.overdue.hr@installmentsoverdue.e2e',
	roles: ['applicant'] as const,
}

export const allInstallmentsOverdueUsers = [
	installmentsOverdueAgent,
	hrOverdueInstallmentsAgent,
	nonInstallmentsOverdueAgent,
	applicantOverdueInstallmentsBlocked,
	applicantOverdueHrPending,
]

export const installmentsOverdueCompany = {
	name: 'Installments Overdue E2E Company',
	domain: 'installmentsoverdue.e2e',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}
