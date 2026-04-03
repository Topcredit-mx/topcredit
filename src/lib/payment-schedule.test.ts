import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { generatePaymentSchedule } from './payment-schedule'
import { financedCreditAmount } from './pre-authorization-capacity'

function utc(year: number, month: number, day: number): Date {
	return new Date(Date.UTC(year, month, day))
}

const principal = 18000
const rate = 0.025

describe('generatePaymentSchedule monthly', () => {
	const schedule = generatePaymentSchedule({
		loanPrincipal: principal,
		rate,
		totalPayments: 12,
		frequency: 'monthly',
		firstDiscountDate: utc(2026, 0, 31), // Jan 31
	})

	test('returns 12 entries', () => {
		assert.equal(schedule.length, 12)
	})

	test('all dates are month-end boundaries', () => {
		for (const entry of schedule) {
			const d = entry.dueDate
			const lastDay = new Date(
				Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
			).getUTCDate()
			assert.equal(
				d.getUTCDate(),
				lastDay,
				`${d.toISOString()} is not month-end`,
			)
		}
	})

	test('first payment is on firstDiscountDate', () => {
		assert.deepEqual(schedule[0]?.dueDate, utc(2026, 0, 31))
	})

	test('dates are consecutive months', () => {
		for (let i = 1; i < schedule.length; i++) {
			const prev = schedule[i - 1]
			const curr = schedule[i]
			if (!prev || !curr) throw new Error('missing entry')
			const expectedMonth = (prev.dueDate.getUTCMonth() + 1) % 12
			assert.equal(curr.dueDate.getUTCMonth(), expectedMonth)
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
		firstDiscountDate: utc(2026, 0, 15), // Jan 15
	})

	test('returns 6 entries', () => {
		assert.equal(schedule.length, 6)
	})

	test('dates alternate between 15th and month-end', () => {
		const expectedDates = [
			utc(2026, 0, 15), // Jan 15
			utc(2026, 0, 31), // Jan 31
			utc(2026, 1, 15), // Feb 15
			utc(2026, 1, 28), // Feb 28
			utc(2026, 2, 15), // Mar 15
			utc(2026, 2, 31), // Mar 31
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
		firstDiscountDate: utc(2026, 0, 31), // Jan 31
	})

	test('dates alternate starting from month-end then 15th', () => {
		const expectedDates = [
			utc(2026, 0, 31), // Jan 31
			utc(2026, 1, 15), // Feb 15
			utc(2026, 1, 28), // Feb 28
			utc(2026, 2, 15), // Mar 15
			utc(2026, 2, 31), // Mar 31
			utc(2026, 3, 15), // Apr 15
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
			firstDiscountDate: utc(2026, 0, 31),
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

describe('timezone safety', () => {
	test('all generated dates are at UTC midnight', () => {
		const schedule = generatePaymentSchedule({
			loanPrincipal: principal,
			rate,
			totalPayments: 12,
			frequency: 'monthly',
			firstDiscountDate: utc(2026, 0, 31),
		})
		for (const entry of schedule) {
			assert.equal(
				entry.dueDate.getUTCHours(),
				0,
				`${entry.dueDate.toISOString()} not at UTC midnight`,
			)
			assert.equal(entry.dueDate.getUTCMinutes(), 0)
			assert.equal(entry.dueDate.getUTCSeconds(), 0)
			assert.equal(entry.dueDate.getUTCMilliseconds(), 0)
		}
	})

	test('input date with non-zero time is normalized to UTC midnight', () => {
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
		assert.equal(first.dueDate.getUTCHours(), 0)
		assert.equal(first.dueDate.getUTCMinutes(), 0)
		assert.equal(first.dueDate.getUTCDate(), 31)
	})

	test('local-timezone date input produces correct UTC dates', () => {
		// Simulates a date created from local time (e.g. new Date(2026, 0, 31))
		// which in a negative-offset timezone could become the previous day in UTC.
		// The function should use UTC components of the input, not local.
		const localDate = new Date(2026, 0, 31)
		const schedule = generatePaymentSchedule({
			loanPrincipal: principal,
			rate,
			totalPayments: 3,
			frequency: 'monthly',
			firstDiscountDate: localDate,
		})
		const first = schedule[0]
		if (!first) throw new Error('missing entry')
		// Regardless of local timezone, the UTC date should match
		// what the input represents in UTC
		assert.equal(first.dueDate.getUTCHours(), 0)
		assert.equal(first.dueDate.getUTCMinutes(), 0)
		assert.equal(first.dueDate.toISOString().slice(0, 10), '2026-01-31')
	})

	test('month-end dates are correct across DST boundaries', () => {
		// March and November are typical DST transition months
		const schedule = generatePaymentSchedule({
			loanPrincipal: principal,
			rate,
			totalPayments: 12,
			frequency: 'monthly',
			firstDiscountDate: utc(2026, 0, 31), // Jan 31
		})

		// March (index 2) should be March 31
		const march = schedule[2]
		if (!march) throw new Error('missing entry')
		assert.equal(march.dueDate.getUTCMonth(), 2)
		assert.equal(march.dueDate.getUTCDate(), 31)

		// November (index 10) should be November 30
		const november = schedule[10]
		if (!november) throw new Error('missing entry')
		assert.equal(november.dueDate.getUTCMonth(), 10)
		assert.equal(november.dueDate.getUTCDate(), 30)
	})

	test('bi-monthly dates are correct across DST boundaries', () => {
		// Start in February, cross March DST boundary
		const schedule = generatePaymentSchedule({
			loanPrincipal: principal,
			rate,
			totalPayments: 6,
			frequency: 'bi-monthly',
			firstDiscountDate: utc(2026, 1, 15), // Feb 15
		})
		const expectedDates = [
			utc(2026, 1, 15), // Feb 15
			utc(2026, 1, 28), // Feb 28
			utc(2026, 2, 15), // Mar 15 (DST spring forward)
			utc(2026, 2, 31), // Mar 31
			utc(2026, 3, 15), // Apr 15
			utc(2026, 3, 30), // Apr 30
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
			firstDiscountDate: utc(2026, 10, 30), // Nov 30
		})
		const expectedDates = [
			utc(2026, 10, 30), // Nov 30
			utc(2026, 11, 31), // Dec 31
			utc(2027, 0, 31), // Jan 31 (year boundary)
			utc(2027, 1, 28), // Feb 28
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
			firstDiscountDate: utc(2027, 11, 31), // Dec 31, 2027
		})
		const feb = schedule[2]
		if (!feb) throw new Error('missing entry')
		assert.equal(feb.dueDate.getUTCMonth(), 1) // February
		assert.equal(feb.dueDate.getUTCDate(), 29) // Leap year
	})
})
