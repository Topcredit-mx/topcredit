export const hrAgentPaymentGrace = {
	name: 'HR Agent Payment Grace',
	email: 'hr.agent@paymentgrace.e2e',
	roles: ['agent', 'hr'] as const,
}

export const installmentsAgentPaymentGrace = {
	name: 'Installments Agent Payment Grace',
	email: 'installments.agent@paymentgrace.e2e',
	roles: ['agent', 'installments'] as const,
}

export const applicantPaymentGraceWithin = {
	name: 'Applicant Payment Grace Within',
	email: 'applicant.within@paymentgrace.e2e',
	roles: ['applicant'] as const,
}

export const applicantPaymentGraceOverdue = {
	name: 'Applicant Payment Grace Overdue',
	email: 'applicant.overdue@paymentgrace.e2e',
	roles: ['applicant'] as const,
}

export const applicantInstallmentGraceWithin = {
	name: 'Applicant Installment Grace Within',
	email: 'applicant.inst.within@paymentgrace.e2e',
	roles: ['applicant'] as const,
}

export const applicantInstallmentGraceOverdue = {
	name: 'Applicant Installment Grace Overdue',
	email: 'applicant.inst.overdue@paymentgrace.e2e',
	roles: ['applicant'] as const,
}

export const applicantCreditDetailGrace = {
	name: 'Applicant Credit Detail Grace',
	email: 'applicant.detail.grace@paymentgrace.e2e',
	roles: ['applicant'] as const,
}

export const applicantCreditDetailInstallmentGrace = {
	name: 'Applicant Credit Detail Installment Grace',
	email: 'applicant.detail.installment.grace@paymentgrace.e2e',
	roles: ['applicant'] as const,
}

export const allPaymentGraceUsers = [
	hrAgentPaymentGrace,
	installmentsAgentPaymentGrace,
	applicantPaymentGraceWithin,
	applicantPaymentGraceOverdue,
	applicantInstallmentGraceWithin,
	applicantInstallmentGraceOverdue,
	applicantCreditDetailGrace,
	applicantCreditDetailInstallmentGrace,
]

export const paymentGraceCompany = {
	name: 'Payment Grace E2E Co',
	domain: 'paymentgrace.e2e',
	rate: '0.36',
	employeeSalaryFrequency: 'monthly' as const,
	active: true,
}
