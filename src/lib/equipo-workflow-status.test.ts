import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { endOfDayInstantMexicoCity } from './calendar-date-tz'
import {
	isEquipoScheduleConfirmationOnTime,
	resolveCreditDetailCollectionStatus,
	resolveCreditDetailDeductionStatus,
	resolveQueueWorkflowStatus,
	scheduleDueYmdFromQueueDueField,
} from './equipo-workflow-status'

const todayYmd = '2023-01-05'

describe('resolveCreditDetailDeductionStatus', () => {
	test('RH grace-pending when past due EOD but within 15 Mexico calendar days of listing overdue cutoff', () => {
		const dueDate = endOfDayInstantMexicoCity('2022-12-30')
		const now = new Date('2023-01-01T00:00:00.000Z')
		const got = resolveCreditDetailDeductionStatus({
			hrConfirmedAt: null,
			dueDate,
			todayYmd,
			now,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-deduction-grace-pending')
		assert.deepEqual(got.context, {
			kind: 'due',
			dateIso: '2022-12-30',
		})
	})

	test('RH overdue when not confirmed and due_date before grace cutoff (Mexico calendar)', () => {
		const dueDate = endOfDayInstantMexicoCity('2022-12-10')
		const got = resolveCreditDetailDeductionStatus({
			hrConfirmedAt: null,
			dueDate,
			todayYmd: '2023-01-20',
			now: new Date('2023-01-20T12:00:00.000Z'),
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-deduction-overdue')
		assert.deepEqual(got.context, {
			kind: 'due',
			dateIso: '2022-12-10',
		})
	})

	test('RH grace-pending on 15th Mexico calendar day after due (due EOD not before grace cutoff start)', () => {
		const dueDate = endOfDayInstantMexicoCity('2023-01-05')
		const got = resolveCreditDetailDeductionStatus({
			hrConfirmedAt: null,
			dueDate,
			todayYmd: '2023-01-20',
			now: new Date('2023-01-20T12:00:00.000Z'),
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-deduction-grace-pending')
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

	test('date-only YYYY-MM-DD string uses Mexico EOD, not UTC midnight', () => {
		const onTime = isEquipoScheduleConfirmationOnTime(
			'2022-11-30',
			new Date('2022-12-01T05:00:00.000Z'),
		)
		assert.equal(
			onTime,
			true,
			'on or before 2022-11-30 23:59:59.999 CDMX (same as EOD instants test)',
		)
		const late = isEquipoScheduleConfirmationOnTime(
			'2022-11-30',
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

	test('installment grace-pending when past due EOD, RH confirmed before today, within grace window', () => {
		const now = new Date('2022-12-10T15:00:00.000Z')
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date('2022-12-01T10:00:00.000Z'),
			installmentConfirmedAt: null,
			dueDate: endOfDayInstantMexicoCity('2022-11-30'),
			todayYmd: '2022-12-10',
			now,
		})
		assert.equal(
			got.messageKey,
			'equipo-credit-detail-collection-grace-pending',
		)
		assert.deepEqual(got.context, {
			kind: 'due',
			dateIso: '2022-11-30',
		})
	})

	test('installment delayed when past grace cutoff, RH confirmed before today', () => {
		const now = new Date('2022-12-20T15:00:00.000Z')
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date('2022-12-01T10:00:00.000Z'),
			installmentConfirmedAt: null,
			dueDate: endOfDayInstantMexicoCity('2022-10-15'),
			todayYmd: '2022-12-20',
			now,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-collection-delayed')
		assert.deepEqual(got.context, {
			kind: 'due',
			dateIso: '2022-10-15',
		})
	})

	test('installment pending when RH confirmed today after due EOD but still in grace window', () => {
		const now = new Date('2022-12-10T15:00:00.000Z')
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date('2022-12-10T14:00:00.000Z'),
			installmentConfirmedAt: null,
			dueDate: endOfDayInstantMexicoCity('2022-11-30'),
			todayYmd: '2022-12-10',
			now,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-collection-pending')
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

	test('late installment confirmation is not relabeled as liquidation settled', () => {
		const dueDate = endOfDayInstantMexicoCity('2022-11-30')
		const instAt = new Date('2022-12-02T10:00:00.000Z')
		const liqAt = new Date('2022-12-05T10:00:00.000Z')
		const now = new Date('2022-12-15T00:00:00.000Z')
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date('2022-11-15T12:00:00.000Z'),
			installmentConfirmedAt: instAt,
			closedByLiquidationAt: liqAt,
			dueDate,
			todayYmd,
			now,
		})
		assert.equal(got.messageKey, 'equipo-credit-detail-collection-confirmed')
		assert.equal(got.tone, 'amber')
		assert.equal(got.context.kind, 'installmentConfirmed')
	})

	test('liquidation settled when installment still pending and closed by liquidation', () => {
		const clearedAt = new Date('2022-12-05T10:00:00.000Z')
		const now = new Date('2022-12-15T00:00:00.000Z')
		const got = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date('2022-11-15T12:00:00.000Z'),
			installmentConfirmedAt: null,
			closedByLiquidationAt: clearedAt,
			dueDate: endOfDayInstantMexicoCity('2022-11-30'),
			todayYmd,
			now,
		})
		assert.equal(
			got.messageKey,
			'equipo-credit-detail-collection-liquidation-settled',
		)
		assert.equal(got.context.kind, 'liquidationSettled')
		if (got.context.kind === 'liquidationSettled') {
			assert.equal(got.context.clearedAtIso, clearedAt.toISOString())
		}
	})
})

describe('scheduleDueYmdFromQueueDueField', () => {
	test('treats YYYY-MM-DD as schedule YMD (EOD Mexico)', () => {
		assert.equal(scheduleDueYmdFromQueueDueField('2023-03-15'), '2023-03-15')
	})
})

describe('resolveQueueWorkflowStatus', () => {
	test('grace when RH unconfirmed, past due EOD, within overdue grace window', () => {
		const dueDate = endOfDayInstantMexicoCity('2022-12-30')
		const now = new Date('2023-01-01T00:00:00.000Z')
		const got = resolveQueueWorkflowStatus({
			hrConfirmedAt: null,
			installmentConfirmedAt: null,
			dueDate,
			now,
		})
		assert.equal(got.tone, 'amber')
		assert.equal(got.messageKey, 'equipo-credit-detail-deduction-grace-pending')
	})

	test('RH pending (not grace) when still on or before due EOD', () => {
		const dueDate = endOfDayInstantMexicoCity('2023-01-10')
		const now = new Date('2023-01-01T00:00:00.000Z')
		const got = resolveQueueWorkflowStatus({
			hrConfirmedAt: null,
			installmentConfirmedAt: null,
			dueDate,
			now,
		})
		assert.equal(got.tone, 'gray')
		assert.equal(got.messageKey, 'equipo-workflow-status-rh-pending')
	})

	test('delegates to collection resolution when RH confirmed and installment pending', () => {
		const dueDate = endOfDayInstantMexicoCity('2022-11-30')
		const now = new Date('2022-12-15T00:00:00.000Z')
		const got = resolveQueueWorkflowStatus({
			hrConfirmedAt: new Date('2022-11-15T12:00:00.000Z').toISOString(),
			installmentConfirmedAt: null,
			dueDate,
			now,
		})
		const expected = resolveCreditDetailCollectionStatus({
			hrConfirmedAt: new Date('2022-11-15T12:00:00.000Z'),
			installmentConfirmedAt: null,
			closedByLiquidationAt: null,
			dueDate,
			todayYmd: undefined,
			now,
		})
		assert.equal(got.tone, expected.tone)
		assert.equal(got.messageKey, expected.messageKey)
	})

	test('throws when hrConfirmedAt is unparseable', () => {
		assert.throws(
			() =>
				resolveQueueWorkflowStatus({
					hrConfirmedAt: 'not-a-date',
					installmentConfirmedAt: null,
					dueDate: endOfDayInstantMexicoCity('2022-12-30'),
					now: new Date('2023-01-01T00:00:00.000Z'),
				}),
			RangeError,
		)
	})
})
