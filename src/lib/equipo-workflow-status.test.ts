import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { endOfDayInstantMexicoCity } from './calendar-date-tz'
import {
	isEquipoScheduleConfirmationOnTime,
	resolveCreditDetailCollectionStatus,
	resolveCreditDetailDeductionStatus,
} from './equipo-workflow-status'

const todayYmd = '2023-01-05'

describe('resolveCreditDetailDeductionStatus', () => {
	test('RH overdue when not confirmed and after due EOD (Mexico)', () => {
		const dueDate = endOfDayInstantMexicoCity('2022-12-30')
		const now = new Date('2023-01-01T00:00:00.000Z')
		const got = resolveCreditDetailDeductionStatus({
			hrConfirmedAt: null,
			dueDate,
			todayYmd,
			now,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-deduction-overdue')
		assert.deepEqual(got.context, {
			kind: 'due',
			dateIso: '2022-12-30',
		})
	})

	test('RH pending when not confirmed and now is before or at due EOD', () => {
		const dueDate = endOfDayInstantMexicoCity('2023-01-30')
		const now = new Date('2023-01-20T00:00:00.000Z')
		const got = resolveCreditDetailDeductionStatus({
			hrConfirmedAt: null,
			dueDate,
			todayYmd,
			now,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-deduction-pending')
		assert.deepEqual(got.context, {
			kind: 'due',
			dateIso: '2023-01-30',
		})
	})

	test('deduction confirmed on time when RH at or before due EOD (Mexico City)', () => {
		const dueDate = endOfDayInstantMexicoCity('2022-11-30')
		const hrAt = new Date('2022-11-30T20:00:00.000Z')
		const now = new Date('2022-12-15T00:00:00.000Z')
		const got = resolveCreditDetailDeductionStatus({
			hrConfirmedAt: hrAt,
			dueDate,
			todayYmd,
			now,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-deduction-confirmed')
		assert.equal(got.tone, 'green')
		assert.equal(got.context.kind, 'hrConfirmed')
		if (got.context.kind === 'hrConfirmed') {
			assert.equal(got.context.confirmedLate, false)
			assert.equal(got.context.confirmedAtIso, hrAt.toISOString())
		}
	})

	test('deduction confirmed late when RH is after due EOD', () => {
		const dueDate = endOfDayInstantMexicoCity('2022-11-30')
		const now = new Date('2022-12-15T00:00:00.000Z')
		const got = resolveCreditDetailDeductionStatus({
			hrConfirmedAt: new Date('2022-12-01T10:00:00.000Z'),
			dueDate,
			todayYmd,
			now,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-deduction-confirmed')
		assert.equal(got.tone, 'amber')
		assert.equal(got.context.kind, 'hrConfirmed')
		if (got.context.kind === 'hrConfirmed') {
			assert.equal(got.context.confirmedLate, true)
		}
	})

	test('deduction on time in Mexico City when UTC confirmation is “next” UTC day but same Mexico day as due', () => {
		const dueDate = endOfDayInstantMexicoCity('2022-11-30')
		const now = new Date('2022-12-15T00:00:00.000Z')
		const got = resolveCreditDetailDeductionStatus({
			dueDate,
			hrConfirmedAt: new Date('2022-12-01T05:00:00.000Z'),
			todayYmd,
			now,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-deduction-confirmed')
		assert.equal(got.tone, 'green')
		assert.equal(got.context.kind, 'hrConfirmed')
		if (got.context.kind === 'hrConfirmed') {
			assert.equal(got.context.confirmedLate, false)
		}
	})
})

describe('isEquipoScheduleConfirmationOnTime', () => {
	test('on time when confirmation is on or before due EOD (Mexico City)', () => {
		const onTime = isEquipoScheduleConfirmationOnTime(
			endOfDayInstantMexicoCity('2022-11-30'),
			new Date('2022-12-01T05:00:00.000Z'),
		)
		assert.equal(onTime, true)
	})

	test('late when confirmation is after due EOD', () => {
		const late = isEquipoScheduleConfirmationOnTime(
			endOfDayInstantMexicoCity('2022-11-30'),
			new Date('2022-12-01T10:00:00.000Z'),
		)
		assert.equal(late, false)
	})
})

describe('resolveCreditDetailCollectionStatus', () => {
	test('installment confirmed on time at or before due EOD (Mexico City)', () => {
		const dueDate = endOfDayInstantMexicoCity('2022-11-30')
		const instAt = new Date('2022-11-30T22:00:00.000Z')
		const now = new Date('2022-12-15T00:00:00.000Z')
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date('2022-11-15T12:00:00.000Z'),
			installmentConfirmedAt: instAt,
			dueDate,
			todayYmd,
			now,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-collection-confirmed')
		assert.equal(got.tone, 'green')
		assert.equal(got.context.kind, 'installmentConfirmed')
		if (got.context.kind === 'installmentConfirmed') {
			assert.equal(got.context.confirmedLate, false)
			assert.equal(got.context.confirmedAtIso, instAt.toISOString())
		}
	})

	test('installment confirmed late when after due EOD (Mexico City)', () => {
		const now = new Date('2022-12-15T00:00:00.000Z')
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date(Date.UTC(2022, 10, 31)),
			installmentConfirmedAt: new Date(Date.UTC(2022, 11, 2, 10, 0, 0)),
			dueDate: endOfDayInstantMexicoCity('2022-11-30'),
			todayYmd,
			now,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-collection-confirmed')
		assert.equal(got.tone, 'amber')
		assert.equal(got.context.kind, 'installmentConfirmed')
		if (got.context.kind === 'installmentConfirmed') {
			assert.equal(got.context.confirmedLate, true)
		}
	})

	test('installment on time when UTC is next UTC day but same Mexico day as due', () => {
		const instAt = new Date('2022-12-01T05:00:00.000Z')
		const now = new Date('2022-12-15T00:00:00.000Z')
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date(Date.UTC(2022, 10, 30, 20, 0, 0)),
			installmentConfirmedAt: instAt,
			dueDate: endOfDayInstantMexicoCity('2022-11-30'),
			todayYmd,
			now,
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
		const now = new Date('2022-12-15T00:00:00.000Z')
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: null,
			installmentConfirmedAt: null,
			dueDate: endOfDayInstantMexicoCity('2023-01-30'),
			todayYmd,
			now,
		})
		assert.equal(
			got.messageKey,
			'equipo-credit-detail-collection-awaiting-deduction',
		)
		assert.deepEqual(got.context, { kind: 'none' })
	})

	test('installment delayed when past due EOD, RH confirmed, installment pending', () => {
		const now = new Date('2022-12-10T15:00:00.000Z')
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date('2022-12-01T10:00:00.000Z'),
			installmentConfirmedAt: null,
			dueDate: endOfDayInstantMexicoCity('2022-11-30'),
			todayYmd: '2022-12-10',
			now,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-collection-delayed')
		assert.deepEqual(got.context, {
			kind: 'due',
			dateIso: '2022-11-30',
		})
	})

	test('installment pending when RH confirmed, not yet past due EOD', () => {
		const now = new Date('2023-01-20T00:00:00.000Z')
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date(Date.UTC(2023, 0, 1)),
			installmentConfirmedAt: null,
			dueDate: endOfDayInstantMexicoCity('2023-01-30'),
			todayYmd,
			now,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-collection-pending')
		assert.deepEqual(got.context, {
			kind: 'due',
			dateIso: '2023-01-30',
		})
	})
})
