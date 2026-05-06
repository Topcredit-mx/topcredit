import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { generatePaymentSchedule } from '~/lib/payment-schedule'
import { sumLiquidationWithoutPrincipal } from './credit-liquidation-without-principal'

describe('sumLiquidationWithoutPrincipal', () => {
	test('matches seeded 50k / 12 monthly credit for 10 open installment rows', () => {
		const loanPrincipal = 50_000
		const rate = 0.025
		const totalPayments = 12
		const firstDiscountDate = new Date('2026-01-31T18:00:00.000Z')
		const schedule = generatePaymentSchedule({
			loanPrincipal,
			rate,
			totalPayments,
			frequency: 'monthly',
			firstDiscountDate,
		})
		const pending = schedule.slice(2)
		const amount = sumLiquidationWithoutPrincipal({
			loanPrincipal,
			rate,
			totalScheduledPayments: totalPayments,
			pendingPayments: pending,
		})
		assert.equal(amount, '1208.33')
	})

	test('returns zero when no pending payments', () => {
		assert.equal(
			sumLiquidationWithoutPrincipal({
				loanPrincipal: 10_000,
				rate: 0.02,
				totalScheduledPayments: 6,
				pendingPayments: [],
			}),
			'0.00',
		)
	})
})
