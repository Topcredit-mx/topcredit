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

	test('deduction confirmed on time when RH confirmed same calendar day as due (Mexico City)', () => {
		const dueAt = new Date('2022-11-30T18:00:00.000Z')
		const hrAt = new Date('2022-11-30T20:00:00.000Z')
		const got = resolveCreditDetailDeductionStatus({
			hrConfirmedAt: hrAt,
			dueDate: dueAt,
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-deduction-confirmed')
		assert.equal(got.tone, 'green')
		assert.equal(got.context.kind, 'hrConfirmed')
		if (got.context.kind === 'hrConfirmed') {
			assert.equal(got.context.confirmedLate, false)
			assert.equal(got.context.confirmedAtIso, hrAt.toISOString())
		}
	})

	test('deduction confirmed late when RH registered after due calendar day', () => {
		const got = resolveCreditDetailDeductionStatus({
			hrConfirmedAt: new Date(Date.UTC(2022, 11, 1, 12, 0, 0)),
			dueDate: new Date(Date.UTC(2022, 10, 30)),
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-deduction-confirmed')
		assert.equal(got.tone, 'amber')
		assert.equal(got.context.kind, 'hrConfirmed')
		if (got.context.kind === 'hrConfirmed') {
			assert.equal(got.context.confirmedLate, true)
		}
	})

	test('deduction on time in Mexico City when UTC confirmation is next day', () => {
		const got = resolveCreditDetailDeductionStatus({
			dueDate: new Date('2022-11-30T12:00:00.000Z'),
			hrConfirmedAt: new Date('2022-12-01T05:00:00.000Z'),
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-deduction-confirmed')
		assert.equal(got.tone, 'green')
		assert.equal(got.context.kind, 'hrConfirmed')
		if (got.context.kind === 'hrConfirmed') {
			assert.equal(got.context.confirmedLate, false)
		}
	})
})

describe('resolveCreditDetailCollectionStatus', () => {
	test('installment confirmed on time same calendar day as due (Mexico City)', () => {
		const dueAt = new Date('2022-11-30T18:00:00.000Z')
		const instAt = new Date('2022-11-30T22:00:00.000Z')
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date('2022-11-15T12:00:00.000Z'),
			installmentConfirmedAt: instAt,
			dueDate: dueAt,
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-collection-confirmed')
		assert.equal(got.tone, 'green')
		assert.equal(got.context.kind, 'installmentConfirmed')
		if (got.context.kind === 'installmentConfirmed') {
			assert.equal(got.context.confirmedLate, false)
			assert.equal(got.context.confirmedAtIso, instAt.toISOString())
		}
	})

	test('installment confirmed late when confirmed after due calendar day (Mexico City)', () => {
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date(Date.UTC(2022, 10, 31)),
			installmentConfirmedAt: new Date(Date.UTC(2022, 11, 2, 10, 0, 0)),
			dueDate: new Date(Date.UTC(2022, 10, 30)),
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-collection-confirmed')
		assert.equal(got.tone, 'amber')
		assert.equal(got.context.kind, 'installmentConfirmed')
		if (got.context.kind === 'installmentConfirmed') {
			assert.equal(got.context.confirmedLate, true)
		}
	})

	test('installment on time in Mexico City when UTC confirmation is next day', () => {
		const instAt = new Date('2022-12-01T05:00:00.000Z')
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date(Date.UTC(2022, 10, 30, 20, 0, 0)),
			installmentConfirmedAt: instAt,
			dueDate: new Date('2022-11-30T12:00:00.000Z'),
			todayYmd,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-collection-confirmed')
		assert.equal(got.tone, 'green')
		assert.equal(got.context.kind, 'installmentConfirmed')
		if (got.context.kind === 'installmentConfirmed') {
			assert.equal(got.context.confirmedLate, false)
			assert.equal(got.context.confirmedAtIso, instAt.toISOString())
		}
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
