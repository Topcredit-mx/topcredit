import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
	resolveCreditDetailCollectionStatus,
	resolveCreditDetailDeductionStatus,
} from './equipo-workflow-status'

const todayYmd = '2023-01-05'

describe('resolveCreditDetailDeductionStatus', () => {
	test('RH overdue when not confirmed and due in the past', () => {
		const got = resolveCreditDetailDeductionStatus({
			hrConfirmedAt: null,
			dueDate: new Date(Date.UTC(2022, 11, 31)),
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-workflow-status-hr-overdue')
	})

	test('RH pending when not confirmed and due not in the past', () => {
		const got = resolveCreditDetailDeductionStatus({
			hrConfirmedAt: null,
			dueDate: new Date(Date.UTC(2023, 0, 31)),
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-workflow-status-rh-pending-detail')
	})

	test('deduction confirmed when RH confirmed', () => {
		const got = resolveCreditDetailDeductionStatus({
			hrConfirmedAt: new Date(Date.UTC(2022, 10, 31)),
			dueDate: new Date(Date.UTC(2022, 10, 30)),
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-deduction-confirmed')
	})
})

describe('resolveCreditDetailCollectionStatus', () => {
	test('confirmed when installment confirmed', () => {
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date(Date.UTC(2022, 10, 31)),
			installmentConfirmedAt: new Date(Date.UTC(2022, 10, 31)),
			dueDate: new Date(Date.UTC(2022, 10, 30)),
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-workflow-status-confirmed')
	})

	test('awaiting deduction when RH not confirmed', () => {
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: null,
			installmentConfirmedAt: null,
			dueDate: new Date(Date.UTC(2023, 0, 31)),
			todayYmd,
		})
		assert.equal(
			got.messageKey,
			'equipo-credit-detail-collection-awaiting-deduction',
		)
	})

	test('installment delayed when RH confirmed, past due, installment pending', () => {
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date(Date.UTC(2022, 10, 31)),
			installmentConfirmedAt: null,
			dueDate: new Date(Date.UTC(2022, 10, 30)),
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-workflow-status-installment-delayed')
	})

	test('installment pending when RH confirmed, due not past', () => {
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date(Date.UTC(2023, 0, 1)),
			installmentConfirmedAt: null,
			dueDate: new Date(Date.UTC(2023, 0, 31)),
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-workflow-status-installment-pending')
	})
})
