export const paymentsOverdueReceiptAgent = {
	name: 'Payments Overdue Receipt Agent',
	email: 'payments.overdue.receipt@paymentsoverduereceipt.com',
	roles: ['agent', 'payments'] as const,
}

export const hrOverdueReceiptAgent = {
	name: 'HR Overdue Receipt Agent',
	email: 'hr.overdue.receipt@paymentsoverduereceipt.com',
	roles: ['agent', 'hr'] as const,
}

export const nonPaymentsOverdueReceiptAgent = {
	name: 'Authz Overdue Receipt Agent',
	email: 'authz.overdue.receipt@paymentsoverduereceipt.com',
	roles: ['agent', 'authorizations'] as const,
}

export const applicantOverdueReceipt = {
	name: 'Applicant Overdue Receipt',
	email: 'applicant.overdue.receipt@paymentsoverduereceipt.com',
	roles: ['applicant'] as const,
}

export const allPaymentsOverdueReceiptUsers = [
	paymentsOverdueReceiptAgent,
	hrOverdueReceiptAgent,
	nonPaymentsOverdueReceiptAgent,
	applicantOverdueReceipt,
]

export const paymentsOverdueReceiptCompany = {
	name: 'Payments Overdue Receipt E2E Company',
	domain: 'paymentsoverduereceipt.com',
	rate: '0.0250',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}
