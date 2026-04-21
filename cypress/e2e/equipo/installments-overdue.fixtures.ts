export const installmentsOverdueAgent = {
	name: 'Payments Overdue Receipt Agent',
	email: 'payments.overdue.receipt@paymentsoverduereceipt.com',
	roles: ['agent', 'installments'] as const,
}

export const hrOverdueReceiptAgent = {
	name: 'HR Overdue Receipt Agent',
	email: 'hr.overdue.receipt@paymentsoverduereceipt.com',
	roles: ['agent', 'hr'] as const,
}

export const nonInstallmentsOverdueAgent = {
	name: 'Authz Overdue Receipt Agent',
	email: 'authz.overdue.receipt@paymentsoverduereceipt.com',
	roles: ['agent', 'authorizations'] as const,
}

export const applicantOverdueReceipt = {
	name: 'Applicant Overdue Receipt',
	email: 'applicant.overdue.receipt@paymentsoverduereceipt.com',
	roles: ['applicant'] as const,
}

export const applicantOverdueReceiptHrPending = {
	name: 'Applicant Overdue HR Pending',
	email: 'applicant.overdue.hr@paymentsoverduereceipt.com',
	roles: ['applicant'] as const,
}

export const allInstallmentsOverdueUsers = [
	installmentsOverdueAgent,
	hrOverdueReceiptAgent,
	nonInstallmentsOverdueAgent,
	applicantOverdueReceipt,
	applicantOverdueReceiptHrPending,
]

export const installmentsOverdueCompany = {
	name: 'Payments Overdue Receipt E2E Company',
	domain: 'paymentsoverduereceipt.com',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}
