import assert from 'node:assert'
import test from 'node:test'
import { creditHasLongOverdueForAdminDefault } from './credit-admin-default'

test('creditHasLongOverdueForAdminDefault is false when no payments', () => {
	assert.equal(
		creditHasLongOverdueForAdminDefault([], new Date('2023-01-05T12:00:00Z')),
		false,
	)
})

test('creditHasLongOverdueForAdminDefault is true when a payment is 14+ calendar days overdue and unconfirmed', () => {
	const asOf = new Date('2023-01-05T12:00:00Z')
	const ok = creditHasLongOverdueForAdminDefault(
		[
			{
				dueDate: new Date('2022-12-10T12:00:00Z'),
				hrConfirmedAt: null,
				installmentConfirmedAt: null,
			},
		],
		asOf,
	)
	assert.equal(ok, true)
})

test('creditHasLongOverdueForAdminDefault is false when overdue is under 14 calendar days', () => {
	const asOf = new Date('2023-01-05T12:00:00Z')
	const ok = creditHasLongOverdueForAdminDefault(
		[
			{
				dueDate: new Date('2022-12-31T12:00:00Z'),
				hrConfirmedAt: null,
				installmentConfirmedAt: null,
			},
		],
		asOf,
	)
	assert.equal(ok, false)
})

test('creditHasLongOverdueForAdminDefault is false when long-overdue row is fully confirmed', () => {
	const asOf = new Date('2023-01-05T12:00:00Z')
	const ok = creditHasLongOverdueForAdminDefault(
		[
			{
				dueDate: new Date('2022-12-10T12:00:00Z'),
				hrConfirmedAt: new Date('2022-12-21T12:00:00Z'),
				installmentConfirmedAt: new Date('2022-12-21T12:00:00Z'),
			},
		],
		asOf,
	)
	assert.equal(ok, false)
})
