import { Decimal } from './decimal'

export const PRE_AUTH_IVA_FACTOR = 1.16

function financedRateFactor(rate: number): Decimal {
	return new Decimal(1).plus(new Decimal(rate).mul(PRE_AUTH_IVA_FACTOR))
}

export function monthlySalaryFromApplicant(
	salaryAmount: number,
	applicantSalaryFrequency: 'monthly' | 'bi-monthly',
): number {
	if (applicantSalaryFrequency === 'bi-monthly') {
		return new Decimal(salaryAmount).mul(2).toNumber()
	}
	return salaryAmount
}

export function monthlySalaryFromApplication(
	salaryAtApplication: string,
	salaryFrequency: 'monthly' | 'bi-monthly',
): number | null {
	const trimmed = salaryAtApplication.trim()
	const n = Number.parseFloat(trimmed)
	if (Number.isNaN(n) || n <= 0) {
		return null
	}
	return monthlySalaryFromApplicant(n, salaryFrequency)
}

export function parsePositiveRate(rateString: string): number | null {
	const n = Number.parseFloat(rateString.trim())
	if (Number.isNaN(n) || n <= 0) {
		return null
	}
	return n
}

export function parseBorrowingCapacityRate(
	rateString: string | null,
): number | null {
	if (rateString == null || rateString.trim() === '') {
		return null
	}
	const n = Number.parseFloat(rateString.trim())
	if (Number.isNaN(n) || n <= 0 || n > 1) {
		return null
	}
	return n
}

export function financedCreditAmount(
	loanPrincipal: number,
	rate: number,
): number {
	return new Decimal(loanPrincipal).mul(financedRateFactor(rate)).toNumber()
}

export function amortizationPayment(
	loanPrincipal: number,
	rate: number,
	totalPayments: number,
): number {
	if (totalPayments <= 0) {
		return Number.POSITIVE_INFINITY
	}
	return new Decimal(financedCreditAmount(loanPrincipal, rate))
		.div(totalPayments)
		.toNumber()
}

export function maxDebtCapacityForLoanPeriod(
	monthlySalary: number,
	borrowingCapacityRate: number,
	loanDurationType: 'monthly' | 'bi-monthly',
): number {
	const monthlyCapacity = new Decimal(monthlySalary).mul(borrowingCapacityRate)
	if (loanDurationType === 'monthly') {
		return monthlyCapacity.toNumber()
	}
	return monthlyCapacity.div(2).toNumber()
}

export function maxLoanPrincipalForCapacity(params: {
	maxDebtCapacityPerLoanPeriod: number
	rate: number
	totalPayments: number
}): number {
	const { maxDebtCapacityPerLoanPeriod, rate, totalPayments } = params
	return new Decimal(maxDebtCapacityPerLoanPeriod)
		.mul(totalPayments)
		.div(financedRateFactor(rate))
		.toNumber()
}

export function isPreAuthOverCapacity(params: {
	loanPrincipal: number
	rate: number
	totalPayments: number
	borrowingCapacityRate: number
	monthlySalary: number
	loanDurationType: 'monthly' | 'bi-monthly'
}): boolean {
	const maxDebt = maxDebtCapacityForLoanPeriod(
		params.monthlySalary,
		params.borrowingCapacityRate,
		params.loanDurationType,
	)
	const payment = amortizationPayment(
		params.loanPrincipal,
		params.rate,
		params.totalPayments,
	)
	return new Decimal(payment).gt(maxDebt)
}
