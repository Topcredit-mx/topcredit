import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { liquidationOutstandingFromPaymentRows } from './credit-liquidation-preview'

describe('liquidationOutstandingFromPaymentRows', () => {
	test('counts liquidation-closed rows like confirmed installments', () => {
		const got = liquidationOutstandingFromPaymentRows([
			{
				amount: '10.00',
				principalAmount: '8.00',
				financingAmount: '2.00',
				installmentConfirmedAt: new Date('2026-01-01'),
				closedByLiquidationAt: null,
			},
			{
				amount: '10.00',
				principalAmount: '8.00',
				financingAmount: '2.00',
				installmentConfirmedAt: null,
				closedByLiquidationAt: new Date('2026-02-01'),
			},
			{
				amount: '5.00',
				principalAmount: '4.00',
				financingAmount: '1.00',
				installmentConfirmedAt: null,
				closedByLiquidationAt: null,
			},
		])
		assert.equal(got.pendingInstallmentCount, 1)
		assert.equal(got.confirmedInstallmentCount, 2)
		assert.equal(got.outstandingScheduledTotal, '5.00')
	})
})
