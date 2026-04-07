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

test('financedCreditAmount produces exact result for 18000 at 2.5%', () => {
	assert.equal(financedCreditAmount(18000, 0.025), 18522)
})

test('financedCreditAmount avoids floating-point drift for 50000 at 2.5%', () => {
	// 50000 * (1 + 0.025 * 1.16) = 50000 * 1.029 = 51450 exactly
	// Native JS: 0.025 * 1.16 = 0.028999999999999998 → 51449.99...
	assert.equal(financedCreditAmount(50000, 0.025), 51450)
})

test('amortizationPayment: payment * totalPayments equals financed amount exactly', () => {
	const payment = amortizationPayment(50000, 0.025, 12)
	assert.equal(payment * 12, 51450)
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
	assert.ok(amort <= maxDebt)
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

test('isPreAuthOverCapacity: exact boundary without epsilon tolerance', () => {
	// With precise math, maxLoanPrincipal → amortization should equal maxDebt exactly
	const monthlySalary = 20000
	const borrowingCapacityRate = 0.15
	const rate = 0.025
	const totalPayments = 24
	const loanDurationType = 'monthly' as const
	const maxDebt = maxDebtCapacityForLoanPeriod(
		monthlySalary,
		borrowingCapacityRate,
		loanDurationType,
	)
	const maxPrincipal = maxLoanPrincipalForCapacity({
		maxDebtCapacityPerLoanPeriod: maxDebt,
		rate,
		totalPayments,
	})
	// At exact max principal, should NOT be over capacity
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
	// Even $0.01 above should be over capacity
	assert.equal(
		isPreAuthOverCapacity({
			loanPrincipal: maxPrincipal + 0.01,
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
