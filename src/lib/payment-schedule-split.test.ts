import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { Decimal } from './decimal'
import { generatePaymentSchedule } from './payment-schedule'
import { financedCreditAmount } from './pre-authorization-capacity'

function mxYmdNoon(y: number, month0: number, day: number): Date {
	return new Date(Date.UTC(y, month0, day, 12, 0, 0, 0))
}

function assertScheduleSplitsValid(
	schedule: ReturnType<typeof generatePaymentSchedule>,
	loanPrincipal: number,
	rate: number,
) {
	const financed = financedCreditAmount(loanPrincipal, rate)
	const financingTotal = new Decimal(financed).minus(loanPrincipal)
	let sumPrincipal = new Decimal(0)
	let sumFinancing = new Decimal(0)
	let sumAmount = new Decimal(0)

	for (let i = 0; i < schedule.length; i++) {
		const row = schedule[i]
		if (!row) throw new Error('missing row')
		const p = new Decimal(row.principalAmount)
		const f = new Decimal(row.financingAmount)
		const a = new Decimal(row.amount)
		assert.equal(
			p.plus(f).toFixed(2),
			a.toFixed(2),
			`row ${i}: principal + financing must equal amount`,
		)
		sumPrincipal = sumPrincipal.plus(p)
		sumFinancing = sumFinancing.plus(f)
		sumAmount = sumAmount.plus(a)
	}

	assert.equal(sumAmount.toFixed(2), new Decimal(financed).toFixed(2))
	assert.equal(sumPrincipal.toFixed(2), new Decimal(loanPrincipal).toFixed(2))
	assert.equal(sumFinancing.toFixed(2), financingTotal.toFixed(2))
}

describe('generatePaymentSchedule principal/financing split', () => {
	test('rows sum principal to loan principal and financing to financing total', () => {
		const loanPrincipal = 18000
		const rate = 0.025
		const schedule = generatePaymentSchedule({
			loanPrincipal,
			rate,
			totalPayments: 12,
			frequency: 'monthly',
			firstDiscountDate: mxYmdNoon(2026, 0, 31),
		})
		assertScheduleSplitsValid(schedule, loanPrincipal, rate)
	})

	test('financing is front-loaded among equal-amount rows; amounts stay equal', () => {
		const loanPrincipal = 50000
		const rate = 0.025
		const schedule = generatePaymentSchedule({
			loanPrincipal,
			rate,
			totalPayments: 12,
			frequency: 'monthly',
			firstDiscountDate: mxYmdNoon(2026, 0, 31),
		})
		assert.equal(schedule.length, 12)
		const firstAmt = schedule[0]?.amount
		const firstFin = new Decimal(schedule[0]?.financingAmount ?? '0')
		const lastFin = new Decimal(schedule[11]?.financingAmount ?? '0')
		assert.ok(firstFin.gt(lastFin))
		for (let i = 0; i < 10; i++) {
			assert.equal(schedule[i]?.amount, firstAmt)
			const f = new Decimal(schedule[i]?.financingAmount ?? '0')
			const n = new Decimal(schedule[i + 1]?.financingAmount ?? '0')
			assert.ok(
				f.gte(n),
				`financing should not increase from row ${String(i)} to ${String(i + 1)}`,
			)
		}
		assert.equal(schedule[10]?.amount, firstAmt)
		assertScheduleSplitsValid(schedule, loanPrincipal, rate)
	})

	test('bi-monthly schedule satisfies split invariants', () => {
		const loanPrincipal = 18000
		const rate = 0.025
		const schedule = generatePaymentSchedule({
			loanPrincipal,
			rate,
			totalPayments: 6,
			frequency: 'bi-monthly',
			firstDiscountDate: mxYmdNoon(2026, 0, 15),
		})
		assertScheduleSplitsValid(schedule, loanPrincipal, rate)
	})
})
