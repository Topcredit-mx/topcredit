import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { ValidationCode } from '~/lib/validation-codes'
import {
	formatCreditAmountInputValue,
	validateRequestedPreAuthorizedCreditAmount,
} from './pre-authorized-requested-credit-amount'

describe('validateRequestedPreAuthorizedCreditAmount', () => {
	test('accepts requested amount equal to pre-authorized max', () => {
		const result = validateRequestedPreAuthorizedCreditAmount('30000', '30000')
		assert.equal(result.ok, true)
		if (result.ok) {
			assert.equal(result.amount, '30000.00')
		}
	})

	test('accepts requested amount lower than pre-authorized max', () => {
		const result = validateRequestedPreAuthorizedCreditAmount('20000', '30000')
		assert.equal(result.ok, true)
		if (result.ok) {
			assert.equal(result.amount, '20000.00')
		}
	})

	test('rejects requested amount above pre-authorized max', () => {
		const result = validateRequestedPreAuthorizedCreditAmount('35000', '30000')
		assert.equal(result.ok, false)
		if (!result.ok) {
			assert.equal(
				result.error,
				ValidationCode.CUENTA_APPLICATION_REQUESTED_CREDIT_EXCEEDS_PREAUTH,
			)
		}
	})

	test('rejects non-positive requested amount', () => {
		const result = validateRequestedPreAuthorizedCreditAmount('0', '30000')
		assert.equal(result.ok, false)
		if (!result.ok) {
			assert.equal(
				result.error,
				ValidationCode.CUENTA_APPLICATION_REQUESTED_CREDIT_INVALID,
			)
		}
	})
})

describe('formatCreditAmountInputValue', () => {
	test('formats numeric strings without decimals', () => {
		assert.equal(formatCreditAmountInputValue('20000'), '20000.00')
	})
})
