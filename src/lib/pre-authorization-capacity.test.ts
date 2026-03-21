import assert from 'node:assert/strict'
import test from 'node:test'
import {
	amortizationPayment,
	financedCreditAmount,
	isPreAuthOverCapacity,
	maxDebtCapacityForLoanPeriod,
	maxLoanPrincipalForCapacity,
	monthlySalaryFromApplicant,
} from './pre-authorization-capacity'

test('monthlySalaryFromApplicant: monthly leaves amount as-is', () => {
	assert.equal(monthlySalaryFromApplicant(10000, 'monthly'), 10000)
})

test('monthlySalaryFromApplicant: bi-monthly doubles quincena to monthly', () => {
	assert.equal(monthlySalaryFromApplicant(5000, 'bi-monthly'), 10000)
})

test('financedCreditAmount matches principal * (1 + rate * 1.16)', () => {
	const principal = 18000
	const rate = 0.025
	const expected = principal * (1 + rate * 1.16)
	assert.equal(financedCreditAmount(principal, rate), expected)
})

test('amortizationPayment divides financed amount by payments', () => {
	const principal = 10000
	const rate = 0.02
	const payments = 12
	const financed = financedCreditAmount(principal, rate)
	assert.equal(
		amortizationPayment(principal, rate, payments),
		financed / payments,
	)
})

test('maxDebtCapacityForLoanPeriod: monthly term uses full monthly capacity', () => {
	const monthlySalary = 10000
	const cap = 0.15
	assert.equal(
		maxDebtCapacityForLoanPeriod(monthlySalary, cap, 'monthly'),
		1500,
	)
})

test('maxDebtCapacityForLoanPeriod: bi-monthly term halves per-period cap', () => {
	const monthlySalary = 10000
	const cap = 0.15
	assert.equal(
		maxDebtCapacityForLoanPeriod(monthlySalary, cap, 'bi-monthly'),
		750,
	)
})

test('maxLoanPrincipalForCapacity inverts formula for monthly term', () => {
	const monthlySalary = 10000
	const borrowingCapacityRate = 0.15
	const rate = 0.025
	const totalPayments = 12
	const maxDebt = maxDebtCapacityForLoanPeriod(
		monthlySalary,
		borrowingCapacityRate,
		'monthly',
	)
	const maxPrincipal = maxLoanPrincipalForCapacity({
		maxDebtCapacityPerLoanPeriod: maxDebt,
		rate,
		totalPayments,
	})
	const amort = amortizationPayment(maxPrincipal, rate, totalPayments)
	assert.ok(amort <= maxDebt + 1e-6)
})

test('isPreAuthOverCapacity: false when payment equals capacity', () => {
	const monthlySalary = 10000
	const borrowingCapacityRate = 0.15
	const rate = 0.025
	const totalPayments = 12
	const loanDurationType = 'monthly' as const
	const maxPrincipal = maxLoanPrincipalForCapacity({
		maxDebtCapacityPerLoanPeriod: maxDebtCapacityForLoanPeriod(
			monthlySalary,
			borrowingCapacityRate,
			loanDurationType,
		),
		rate,
		totalPayments,
	})
	assert.equal(
		isPreAuthOverCapacity({
			loanPrincipal: maxPrincipal,
			rate,
			totalPayments,
			borrowingCapacityRate,
			monthlySalary,
			loanDurationType,
		}),
		false,
	)
})

test('isPreAuthOverCapacity: true when principal slightly above max', () => {
	const monthlySalary = 10000
	const borrowingCapacityRate = 0.15
	const rate = 0.025
	const totalPayments = 12
	const loanDurationType = 'monthly' as const
	const maxPrincipal = maxLoanPrincipalForCapacity({
		maxDebtCapacityPerLoanPeriod: maxDebtCapacityForLoanPeriod(
			monthlySalary,
			borrowingCapacityRate,
			loanDurationType,
		),
		rate,
		totalPayments,
	})
	assert.equal(
		isPreAuthOverCapacity({
			loanPrincipal: maxPrincipal + 1000,
			rate,
			totalPayments,
			borrowingCapacityRate,
			monthlySalary,
			loanDurationType,
		}),
		true,
	)
})

test('applicant bi-monthly salary with monthly loan term', () => {
	const quincena = 5000
	const monthlySalary = monthlySalaryFromApplicant(quincena, 'bi-monthly')
	assert.equal(monthlySalary, 10000)
	const cap = maxDebtCapacityForLoanPeriod(monthlySalary, 0.3, 'monthly')
	assert.equal(cap, 3000)
})
