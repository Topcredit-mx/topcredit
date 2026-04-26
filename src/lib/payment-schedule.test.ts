import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
	endOfDayInstantMexicoCity,
	ymdForDeductionSchedule,
} from './calendar-date-tz'
import { Decimal } from './decimal'
import { generatePaymentSchedule } from './payment-schedule'
import { financedCreditAmount } from './pre-authorization-capacity'

/** Noon UTC so the civil date matches CDMX for typical payroll Y-M-D. */
function mxYmdNoon(y: number, month0: number, day: number): Date {
	return new Date(Date.UTC(y, month0, day, 12, 0, 0, 0))
}

/** Expected due: 23:59:59.999 that day in `America/Mexico_City`. */
function eodMx(y: number, month0: number, day: number): Date {
	const ymd = `${String(y).padStart(4, '0')}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
	return endOfDayInstantMexicoCity(ymd)
}

function lastDayOfYmd(ymd: string): number {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
	if (m == null) return 0
	const y = Number(m[1])
	const mo0 = Number(m[2]) - 1
	return new Date(Date.UTC(y, mo0 + 1, 0)).getUTCDate()
}

const principal = 18000
const rate = 0.025

describe('generatePaymentSchedule monthly', () => {
	const schedule = generatePaymentSchedule({
		loanPrincipal: principal,
		rate,
		totalPayments: 12,
		frequency: 'monthly',
		firstDiscountDate: mxYmdNoon(2026, 0, 31), // Jan 31 CDMX
	})

	test('returns 12 entries', () => {
		assert.equal(schedule.length, 12)
	})

	test('all dates are month-end boundaries (business Y-M-D)', () => {
		for (const entry of schedule) {
			const ymd = ymdForDeductionSchedule(entry.dueDate)
			const day = Number(ymd.slice(8, 10))
			assert.equal(day, lastDayOfYmd(ymd), `${ymd} is not month-end`)
		}
	})

	test('first payment is on firstDiscountDate (EOD Mexico)', () => {
		assert.deepEqual(schedule[0]?.dueDate, eodMx(2026, 0, 31))
	})

	test('dates are consecutive months', () => {
		for (let i = 1; i < schedule.length; i++) {
			const prev = schedule[i - 1]
			const curr = schedule[i]
			if (!prev || !curr) throw new Error('missing entry')
			const p = ymdForDeductionSchedule(prev.dueDate)
			const c = ymdForDeductionSchedule(curr.dueDate)
			const pIdx = Number(p.slice(0, 4)) * 12 + (Number(p.slice(5, 7)) - 1)
			const cIdx = Number(c.slice(0, 4)) * 12 + (Number(c.slice(5, 7)) - 1)
			assert.equal(cIdx, pIdx + 1, `${c} not month after ${p}`)
		}
	})

	test('amounts sum to financedCreditAmount', () => {
		const total = financedCreditAmount(principal, rate)
		const sum = schedule.reduce((acc, e) => acc + Number(e.amount), 0)
		assert.equal(sum.toFixed(2), total.toFixed(2))
	})
})

describe('generatePaymentSchedule bi-monthly', () => {
	const schedule = generatePaymentSchedule({
		loanPrincipal: principal,
		rate,
		totalPayments: 6,
		frequency: 'bi-monthly',
		firstDiscountDate: mxYmdNoon(2026, 0, 15), // Jan 15
	})

	test('returns 6 entries', () => {
		assert.equal(schedule.length, 6)
	})

	test('dates alternate between 15th and month-end', () => {
		const expectedDates = [
			eodMx(2026, 0, 15), // Jan 15
			eodMx(2026, 0, 31), // Jan 31
			eodMx(2026, 1, 15), // Feb 15
			eodMx(2026, 1, 28), // Feb 28
			eodMx(2026, 2, 15), // Mar 15
			eodMx(2026, 2, 31), // Mar 31
		]
		for (let i = 0; i < schedule.length; i++) {
			const entry = schedule[i]
			const expected = expectedDates[i]
			if (!entry || !expected) throw new Error('missing entry')
			assert.deepEqual(entry.dueDate, expected, `payment ${i} date mismatch`)
		}
	})

	test('amounts sum to financedCreditAmount', () => {
		const total = financedCreditAmount(principal, rate)
		const sum = schedule.reduce((acc, e) => acc + Number(e.amount), 0)
		assert.equal(sum.toFixed(2), total.toFixed(2))
	})
})

describe('generatePaymentSchedule bi-monthly starting on month-end', () => {
	const schedule = generatePaymentSchedule({
		loanPrincipal: principal,
		rate,
		totalPayments: 6,
		frequency: 'bi-monthly',
		firstDiscountDate: mxYmdNoon(2026, 0, 31), // Jan 31
	})

	test('dates alternate starting from month-end then 15th', () => {
		const expectedDates = [
			eodMx(2026, 0, 31), // Jan 31
			eodMx(2026, 1, 15), // Feb 15
			eodMx(2026, 1, 28), // Feb 28
			eodMx(2026, 2, 15), // Mar 15
			eodMx(2026, 2, 31), // Mar 31
			eodMx(2026, 3, 15), // Apr 15
		]
		for (let i = 0; i < schedule.length; i++) {
			const entry = schedule[i]
			const expected = expectedDates[i]
			if (!entry || !expected) throw new Error('missing entry')
			assert.deepEqual(entry.dueDate, expected, `payment ${i} date mismatch`)
		}
	})
})

describe('rounding correction', () => {
	test('last payment adjusts so total exactly equals financed amount', () => {
		const schedule = generatePaymentSchedule({
			loanPrincipal: 10000,
			rate: 0.03,
			totalPayments: 12,
			frequency: 'monthly',
			firstDiscountDate: mxYmdNoon(2026, 0, 31),
		})
		const total = financedCreditAmount(10000, 0.03)
		const sum = schedule.reduce((acc, e) => acc + Number(e.amount), 0)
		assert.equal(sum.toFixed(2), total.toFixed(2))

		const firstAmount = schedule[0]?.amount
		const lastAmount = schedule[11]?.amount
		if (!firstAmount || !lastAmount) throw new Error('missing entry')

		for (let i = 0; i < 11; i++) {
			assert.equal(schedule[i]?.amount, firstAmount)
		}
		assert.equal(typeof lastAmount, 'string')
	})
})

describe('decimal precision', () => {
	test('payment amounts sum to financed total exactly via Decimal', () => {
		// 50000 * (1 + 0.025 * 1.16) = 51450 — triggers float drift with vanilla JS
		const schedule = generatePaymentSchedule({
			loanPrincipal: 50000,
			rate: 0.025,
			totalPayments: 12,
			frequency: 'monthly',
			firstDiscountDate: mxYmdNoon(2026, 0, 31),
		})
		const sum = schedule.reduce((acc, e) => acc.plus(e.amount), new Decimal(0))
		assert.equal(sum.toFixed(2), '51450.00')
	})

	test('all regular payments are identical and last adjusts remainder', () => {
		const schedule = generatePaymentSchedule({
			loanPrincipal: 50000,
			rate: 0.025,
			totalPayments: 7,
			frequency: 'monthly',
			firstDiscountDate: mxYmdNoon(2026, 0, 31),
		})
		const firstAmount = schedule[0]?.amount
		if (!firstAmount) throw new Error('missing entry')
		for (let i = 1; i < 6; i++) {
			assert.equal(schedule[i]?.amount, firstAmount, `payment ${i} differs`)
		}
		// Sum must still equal financed total exactly
		const sum = schedule.reduce((acc, e) => acc.plus(e.amount), new Decimal(0))
		assert.equal(sum.toFixed(2), '51450.00')
	})
})

describe('timezone safety', () => {
	test('all generated due instants are end-of-day Mexico (23:59:59.999 local)', () => {
		const schedule = generatePaymentSchedule({
			loanPrincipal: principal,
			rate,
			totalPayments: 12,
			frequency: 'monthly',
			firstDiscountDate: mxYmdNoon(2026, 0, 31),
		})
		for (const entry of schedule) {
			const ymd = ymdForDeductionSchedule(entry.dueDate)
			assert.deepEqual(entry.dueDate, endOfDayInstantMexicoCity(ymd))
		}
	})

	test('input date with non-zero time is normalized to Mexico calendar for schedule', () => {
		const dateWithTime = new Date(Date.UTC(2026, 0, 31, 14, 30, 45, 123))
		const schedule = generatePaymentSchedule({
			loanPrincipal: principal,
			rate,
			totalPayments: 3,
			frequency: 'monthly',
			firstDiscountDate: dateWithTime,
		})
		const first = schedule[0]
		if (!first) throw new Error('missing entry')
		assert.equal(ymdForDeductionSchedule(first.dueDate), '2026-01-31')
		assert.deepEqual(first.dueDate, eodMx(2026, 0, 31))
	})

	test('noon-UTC first discount yields correct Mexico EOD for that civil date', () => {
		const schedule = generatePaymentSchedule({
			loanPrincipal: principal,
			rate,
			totalPayments: 3,
			frequency: 'monthly',
			firstDiscountDate: mxYmdNoon(2026, 0, 31),
		})
		const first = schedule[0]
		if (!first) throw new Error('missing entry')
		assert.equal(ymdForDeductionSchedule(first.dueDate), '2026-01-31')
		assert.deepEqual(first.dueDate, eodMx(2026, 0, 31))
	})

	test('month-end dates are correct across DST boundaries', () => {
		// March and November are typical DST transition months
		const schedule = generatePaymentSchedule({
			loanPrincipal: principal,
			rate,
			totalPayments: 12,
			frequency: 'monthly',
			firstDiscountDate: mxYmdNoon(2026, 0, 31), // Jan 31
		})

		// March (index 2) should be March 31
		const march = schedule[2]
		if (!march) throw new Error('missing entry')
		assert.equal(ymdForDeductionSchedule(march.dueDate), '2026-03-31')

		// November (index 10) should be November 30
		const november = schedule[10]
		if (!november) throw new Error('missing entry')
		assert.equal(ymdForDeductionSchedule(november.dueDate), '2026-11-30')
	})

	test('bi-monthly dates are correct across DST boundaries', () => {
		// Start in February, cross March DST boundary
		const schedule = generatePaymentSchedule({
			loanPrincipal: principal,
			rate,
			totalPayments: 6,
			frequency: 'bi-monthly',
			firstDiscountDate: mxYmdNoon(2026, 1, 15), // Feb 15
		})
		const expectedDates = [
			eodMx(2026, 1, 15), // Feb 15
			eodMx(2026, 1, 28), // Feb 28
			eodMx(2026, 2, 15), // Mar 15 (DST spring forward)
			eodMx(2026, 2, 31), // Mar 31
			eodMx(2026, 3, 15), // Apr 15
			eodMx(2026, 3, 30), // Apr 30
		]
		for (let i = 0; i < schedule.length; i++) {
			const entry = schedule[i]
			const expected = expectedDates[i]
			if (!entry || !expected) throw new Error('missing entry')
			assert.deepEqual(entry.dueDate, expected, `payment ${i} date mismatch`)
		}
	})

	test('year boundary crossing produces correct dates', () => {
		const schedule = generatePaymentSchedule({
			loanPrincipal: principal,
			rate,
			totalPayments: 4,
			frequency: 'monthly',
			firstDiscountDate: mxYmdNoon(2026, 10, 30), // Nov 30
		})
		const expectedDates = [
			eodMx(2026, 10, 30), // Nov 30
			eodMx(2026, 11, 31), // Dec 31
			eodMx(2027, 0, 31), // Jan 31 (year boundary)
			eodMx(2027, 1, 28), // Feb 28
		]
		for (let i = 0; i < schedule.length; i++) {
			const entry = schedule[i]
			const expected = expectedDates[i]
			if (!entry || !expected) throw new Error('missing entry')
			assert.deepEqual(entry.dueDate, expected, `payment ${i} date mismatch`)
		}
	})

	test('leap year February handled correctly', () => {
		// 2028 is a leap year
		const schedule = generatePaymentSchedule({
			loanPrincipal: principal,
			rate,
			totalPayments: 4,
			frequency: 'monthly',
			firstDiscountDate: mxYmdNoon(2027, 11, 31), // Dec 31, 2027
		})
		const feb = schedule[2]
		if (!feb) throw new Error('missing entry')
		assert.equal(ymdForDeductionSchedule(feb.dueDate), '2028-02-29')
	})
})
