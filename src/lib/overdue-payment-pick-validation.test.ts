import assert from 'node:assert/strict'
import test from 'node:test'
import {
	isOverduePaymentPickSelectionContiguous,
	overduePaymentPickLinesSortedByDueDate,
	paymentIdsFormContiguousSelectionByCredit,
} from './overdue-payment-pick-validation'

test('contiguous: empty selection is valid', () => {
	const ok = isOverduePaymentPickSelectionContiguous(
		[
			{
				payments: [
					{ id: 1, dueDate: '2024-01-31', amount: '1' },
					{ id: 2, dueDate: '2024-02-29', amount: '1' },
				],
			},
		],
		new Set(),
	)
	assert.equal(ok, true)
})

test('contiguous: single middle selected is valid', () => {
	const ok = isOverduePaymentPickSelectionContiguous(
		[
			{
				payments: [
					{ id: 1, dueDate: '2024-01-31', amount: '1' },
					{ id: 2, dueDate: '2024-02-29', amount: '1' },
					{ id: 3, dueDate: '2024-03-31', amount: '1' },
				],
			},
		],
		new Set([2]),
	)
	assert.equal(ok, true)
})

test('contiguous: gap between older and newer due dates is invalid', () => {
	const ok = isOverduePaymentPickSelectionContiguous(
		[
			{
				payments: [
					{ id: 1, dueDate: '2024-02-28', amount: '1' },
					{ id: 2, dueDate: '2024-02-29', amount: '1' },
					{ id: 3, dueDate: '2024-03-31', amount: '1' },
				],
			},
		],
		new Set([1, 3]),
	)
	assert.equal(ok, false)
})

test('paymentIdsFormContiguousSelectionByCredit rejects a gap within one credit', () => {
	const ok = paymentIdsFormContiguousSelectionByCredit(
		[
			{ paymentId: 1, creditId: 10, dueDate: '2024-01-31' },
			{ paymentId: 2, creditId: 10, dueDate: '2024-02-28' },
			{ paymentId: 3, creditId: 10, dueDate: '2024-03-31' },
		],
		new Set([1, 3]),
	)
	assert.equal(ok, false)
})

test('overduePaymentPickLinesSortedByDueDate sorts by date then id', () => {
	const sorted = overduePaymentPickLinesSortedByDueDate([
		{ id: 10, dueDate: '2024-03-31', amount: '1' },
		{ id: 2, dueDate: '2024-02-28', amount: '1' },
		{ id: 5, dueDate: '2024-02-28', amount: '1' },
	])
	assert.deepEqual(
		sorted.map((p) => p.id),
		[2, 5, 10],
	)
})
