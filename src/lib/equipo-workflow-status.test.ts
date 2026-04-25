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
		assert.equal(got.messageKey, 'equipo-credit-detail-deduction-overdue')
		assert.deepEqual(got.context, {
			kind: 'due',
			dateIso: '2022-12-31',
		})
	})

	test('RH pending when not confirmed and due not in the past', () => {
		const got = resolveCreditDetailDeductionStatus({
			hrConfirmedAt: null,
			dueDate: new Date(Date.UTC(2023, 0, 31)),
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-deduction-pending')
		assert.deepEqual(got.context, {
			kind: 'due',
			dateIso: '2023-01-31',
		})
	})

	test('deduction confirmed when RH confirmed', () => {
		const got = resolveCreditDetailDeductionStatus({
			hrConfirmedAt: new Date(Date.UTC(2022, 10, 30)),
			dueDate: new Date(Date.UTC(2022, 10, 30)),
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-deduction-confirmed')
		assert.deepEqual(got.context, {
			kind: 'hrConfirmed',
			dateIso: '2022-11-30',
		})
	})
})

describe('resolveCreditDetailCollectionStatus', () => {
	test('confirmed when installment confirmed', () => {
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date(Date.UTC(2022, 10, 30)),
			installmentConfirmedAt: new Date(Date.UTC(2022, 10, 30)),
			dueDate: new Date(Date.UTC(2022, 10, 30)),
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-collection-confirmed')
		assert.deepEqual(got.context, {
			kind: 'installmentConfirmed',
			dateIso: '2022-11-30',
		})
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
		assert.deepEqual(got.context, { kind: 'none' })
	})

	test('installment delayed when RH confirmed, past due, installment pending', () => {
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date(Date.UTC(2022, 10, 31)),
			installmentConfirmedAt: null,
			dueDate: new Date(Date.UTC(2022, 10, 30)),
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-collection-delayed')
		assert.deepEqual(got.context, {
			kind: 'due',
			dateIso: '2022-11-30',
		})
	})

	test('installment pending when RH confirmed, due not past', () => {
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date(Date.UTC(2023, 0, 1)),
			installmentConfirmedAt: null,
			dueDate: new Date(Date.UTC(2023, 0, 31)),
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-collection-pending')
		assert.deepEqual(got.context, {
			kind: 'due',
			dateIso: '2023-01-31',
		})
	})
})
