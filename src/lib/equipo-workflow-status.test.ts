import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { resolveCreditDetailCombinedStatus } from './equipo-workflow-status'

describe('resolveCreditDetailCombinedStatus', () => {
	const todayYmd = '2023-01-05'

	test('shows confirmed when RH confirmed even if due date is in the past', () => {
		const dueDate = new Date(Date.UTC(2022, 10, 30))
		const hrConfirmedAt = new Date(Date.UTC(2022, 10, 31))
		const got = resolveCreditDetailCombinedStatus({
			hrConfirmedAt,
			installmentConfirmedAt: null,
			dueDate,
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-workflow-status-confirmed')
		assert.equal(got.tone, 'green')
	})

	test('shows installment pending when RH confirmed and due is not past', () => {
		const dueDate = new Date(Date.UTC(2023, 0, 31))
		const hrConfirmedAt = new Date(Date.UTC(2023, 0, 1))
		const got = resolveCreditDetailCombinedStatus({
			hrConfirmedAt,
			installmentConfirmedAt: null,
			dueDate,
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-workflow-status-installment-pending')
		assert.equal(got.tone, 'blue')
	})

	test('shows RH overdue when RH not confirmed and due is past', () => {
		const dueDate = new Date(Date.UTC(2022, 11, 31))
		const got = resolveCreditDetailCombinedStatus({
			hrConfirmedAt: null,
			installmentConfirmedAt: null,
			dueDate,
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-workflow-status-hr-overdue')
		assert.equal(got.tone, 'red')
	})
})
