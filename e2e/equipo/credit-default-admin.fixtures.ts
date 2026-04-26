export const creditDefaultAdminCompany = {
	name: 'Credit Default Admin E2E Co',
	domain: 'credit-default-admin.e2e',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}

export const creditDefaultAdminAgent = {
	name: 'Admin Credit Default',
	email: 'admin@credit-default-admin.e2e',
	roles: ['agent', 'admin'] as const,
}

export const creditDefaultInstallmentsAgent = {
	name: 'Installments Credit Default',
	email: 'installments@credit-default-admin.e2e',
	roles: ['agent', 'installments'] as const,
}

export const creditDefaultApplicant = {
	name: 'Empleado Objetivo Incobrable',
	email: 'applicant@credit-default-admin.e2e',
	roles: ['applicant'] as const,
}

export const creditDefaultOtherApplicant = {
	name: 'Empleado Otro Retraso',
	email: 'other@credit-default-admin.e2e',
	roles: ['applicant'] as const,
}

export const allCreditDefaultAdminUsers = [
	creditDefaultAdminAgent,
	creditDefaultInstallmentsAgent,
	creditDefaultApplicant,
	creditDefaultOtherApplicant,
]
