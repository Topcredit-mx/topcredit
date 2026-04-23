import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
	getUpcomingDeductionDate,
	getUpcomingDeductionDateYmd,
	getValidFirstDiscountDates,
	isValidFirstDiscountDate,
} from '~/lib/first-discount-date'

function utc(year: number, month: number, day: number): Date {
	return new Date(Date.UTC(year, month, day))
}

describe('getUpcomingDeductionDate', () => {
	describe('bi-monthly', () => {
		test('early in month suggests the 15th of current month', () => {
			const today = utc(2026, 2, 3) // March 3
			const result = getUpcomingDeductionDate('bi-monthly', today)
			assert.deepEqual(result, utc(2026, 2, 15))
		})

		test('on the 15th suggests the 15th (same day)', () => {
			const today = utc(2026, 2, 15) // March 15
			const result = getUpcomingDeductionDate('bi-monthly', today)
			assert.deepEqual(result, utc(2026, 2, 15))
		})

		test('after the 15th suggests end of current month', () => {
			const today = utc(2026, 2, 16) // March 16
			const result = getUpcomingDeductionDate('bi-monthly', today)
			assert.deepEqual(result, utc(2026, 2, 31)) // March 31
		})

		test('on last day of month suggests that day', () => {
			const today = utc(2026, 2, 31) // March 31
			const result = getUpcomingDeductionDate('bi-monthly', today)
			assert.deepEqual(result, utc(2026, 2, 31))
		})

		test('after last day marker suggests 15th of next month', () => {
			const today = utc(2026, 3, 1) // April 1
			const result = getUpcomingDeductionDate('bi-monthly', today)
			assert.deepEqual(result, utc(2026, 3, 15)) // April 15
		})

		test('handles February (non-leap)', () => {
			const today = utc(2026, 1, 16) // Feb 16, 2026 (non-leap)
			const result = getUpcomingDeductionDate('bi-monthly', today)
			assert.deepEqual(result, utc(2026, 1, 28)) // Feb 28
		})

		test('handles February (leap year)', () => {
			const today = utc(2028, 1, 16) // Feb 16, 2028 (leap)
			const result = getUpcomingDeductionDate('bi-monthly', today)
			assert.deepEqual(result, utc(2028, 1, 29)) // Feb 29
		})
	})

	describe('monthly', () => {
		test('suggests end of current month when early in month', () => {
			const today = utc(2026, 2, 5) // March 5
			const result = getUpcomingDeductionDate('monthly', today)
			assert.deepEqual(result, utc(2026, 2, 31)) // March 31
		})

		test('on last day of month suggests that day', () => {
			const today = utc(2026, 2, 31) // March 31
			const result = getUpcomingDeductionDate('monthly', today)
			assert.deepEqual(result, utc(2026, 2, 31))
		})

		test('handles February', () => {
			const today = utc(2026, 1, 1) // Feb 1
			const result = getUpcomingDeductionDate('monthly', today)
			assert.deepEqual(result, utc(2026, 1, 28)) // Feb 28
		})

		test('handles December to stay in December', () => {
			const today = utc(2026, 11, 10) // Dec 10
			const result = getUpcomingDeductionDate('monthly', today)
			assert.deepEqual(result, utc(2026, 11, 31)) // Dec 31
		})
	})
})

describe('getUpcomingDeductionDateYmd', () => {
	test('matches UTC calendar slice of getUpcomingDeductionDate', () => {
		const today = utc(2026, 2, 5) // March 5
		assert.equal(
			getUpcomingDeductionDateYmd('monthly', today),
			getUpcomingDeductionDate('monthly', today).toISOString().slice(0, 10),
		)
	})
})

describe('getValidFirstDiscountDates', () => {
	test('bi-monthly returns alternating 15th and end-of-month', () => {
		const today = utc(2026, 2, 3) // March 3
		const dates = getValidFirstDiscountDates('bi-monthly', today, 4)
		assert.equal(dates.length, 4)
		assert.deepEqual(dates[0], utc(2026, 2, 15)) // Mar 15
		assert.deepEqual(dates[1], utc(2026, 2, 31)) // Mar 31
		assert.deepEqual(dates[2], utc(2026, 3, 15)) // Apr 15
		assert.deepEqual(dates[3], utc(2026, 3, 30)) // Apr 30
	})

	test('monthly returns consecutive month-ends', () => {
		const today = utc(2026, 2, 5) // March 5
		const dates = getValidFirstDiscountDates('monthly', today, 3)
		assert.equal(dates.length, 3)
		assert.deepEqual(dates[0], utc(2026, 2, 31)) // Mar 31
		assert.deepEqual(dates[1], utc(2026, 3, 30)) // Apr 30
		assert.deepEqual(dates[2], utc(2026, 4, 31)) // May 31
	})

	test('bi-monthly starting after the 15th skips to month-end first', () => {
		const today = utc(2026, 2, 20) // March 20
		const dates = getValidFirstDiscountDates('bi-monthly', today, 3)
		assert.deepEqual(dates[0], utc(2026, 2, 31)) // Mar 31
		assert.deepEqual(dates[1], utc(2026, 3, 15)) // Apr 15
		assert.deepEqual(dates[2], utc(2026, 3, 30)) // Apr 30
	})

	test('no dates earlier than today', () => {
		const today = utc(2026, 2, 31) // March 31
		const dates = getValidFirstDiscountDates('bi-monthly', today, 3)
		for (const d of dates) {
			assert.ok(
				d >= today,
				`${d.toISOString()} should not be before ${today.toISOString()}`,
			)
		}
	})

	test('monthly when today is last day of month includes today', () => {
		const today = utc(2026, 2, 31) // March 31
		const dates = getValidFirstDiscountDates('monthly', today, 3)
		assert.deepEqual(dates[0], utc(2026, 2, 31)) // Mar 31
		assert.deepEqual(dates[1], utc(2026, 3, 30)) // Apr 30
		assert.deepEqual(dates[2], utc(2026, 4, 31)) // May 31
	})

	test('bi-monthly when today is the 15th includes the 15th', () => {
		const today = utc(2026, 2, 15) // March 15
		const dates = getValidFirstDiscountDates('bi-monthly', today, 4)
		assert.deepEqual(dates[0], utc(2026, 2, 15)) // Mar 15
		assert.deepEqual(dates[1], utc(2026, 2, 31)) // Mar 31
		assert.deepEqual(dates[2], utc(2026, 3, 15)) // Apr 15
		assert.deepEqual(dates[3], utc(2026, 3, 30)) // Apr 30
	})

	test('bi-monthly when today is last day includes that day', () => {
		const today = utc(2026, 2, 31) // March 31
		const dates = getValidFirstDiscountDates('bi-monthly', today, 3)
		assert.deepEqual(dates[0], utc(2026, 2, 31)) // Mar 31
		assert.deepEqual(dates[1], utc(2026, 3, 15)) // Apr 15
		assert.deepEqual(dates[2], utc(2026, 3, 30)) // Apr 30
	})

	test('monthly handles December to January year rollover', () => {
		const today = utc(2026, 11, 1) // Dec 1
		const dates = getValidFirstDiscountDates('monthly', today, 3)
		assert.deepEqual(dates[0], utc(2026, 11, 31)) // Dec 31
		assert.deepEqual(dates[1], utc(2027, 0, 31)) // Jan 31
		assert.deepEqual(dates[2], utc(2027, 1, 28)) // Feb 28
	})

	test('bi-monthly handles December to January year rollover', () => {
		const today = utc(2026, 11, 16) // Dec 16
		const dates = getValidFirstDiscountDates('bi-monthly', today, 4)
		assert.deepEqual(dates[0], utc(2026, 11, 31)) // Dec 31
		assert.deepEqual(dates[1], utc(2027, 0, 15)) // Jan 15
		assert.deepEqual(dates[2], utc(2027, 0, 31)) // Jan 31
		assert.deepEqual(dates[3], utc(2027, 1, 15)) // Feb 15
	})

	test('monthly handles February (non-leap year)', () => {
		const today = utc(2026, 1, 1) // Feb 1, 2026
		const dates = getValidFirstDiscountDates('monthly', today, 2)
		assert.deepEqual(dates[0], utc(2026, 1, 28)) // Feb 28
		assert.deepEqual(dates[1], utc(2026, 2, 31)) // Mar 31
	})

	test('monthly handles February (leap year)', () => {
		const today = utc(2028, 1, 1) // Feb 1, 2028 (leap)
		const dates = getValidFirstDiscountDates('monthly', today, 2)
		assert.deepEqual(dates[0], utc(2028, 1, 29)) // Feb 29
		assert.deepEqual(dates[1], utc(2028, 2, 31)) // Mar 31
	})

	test('bi-monthly handles February end (non-leap)', () => {
		const today = utc(2026, 1, 16) // Feb 16, 2026
		const dates = getValidFirstDiscountDates('bi-monthly', today, 3)
		assert.deepEqual(dates[0], utc(2026, 1, 28)) // Feb 28
		assert.deepEqual(dates[1], utc(2026, 2, 15)) // Mar 15
		assert.deepEqual(dates[2], utc(2026, 2, 31)) // Mar 31
	})

	test('returns requested count of 1', () => {
		const today = utc(2026, 2, 3)
		const dates = getValidFirstDiscountDates('monthly', today, 1)
		assert.equal(dates.length, 1)
		assert.deepEqual(dates[0], utc(2026, 2, 31))
	})

	test('monthly when today is day after month-end advances to next month', () => {
		const today = utc(2026, 3, 1) // April 1 (March ended Mar 31)
		const dates = getValidFirstDiscountDates('monthly', today, 2)
		assert.deepEqual(dates[0], utc(2026, 3, 30)) // Apr 30
		assert.deepEqual(dates[1], utc(2026, 4, 31)) // May 31
	})
})

describe('isValidFirstDiscountDate', () => {
	test('bi-monthly accepts the 15th', () => {
		assert.equal(
			isValidFirstDiscountDate('bi-monthly', utc(2026, 2, 15), utc(2026, 2, 3)),
			true,
		)
	})

	test('bi-monthly accepts end of month', () => {
		assert.equal(
			isValidFirstDiscountDate('bi-monthly', utc(2026, 2, 31), utc(2026, 2, 3)),
			true,
		)
	})

	test('bi-monthly rejects arbitrary date', () => {
		assert.equal(
			isValidFirstDiscountDate('bi-monthly', utc(2026, 2, 20), utc(2026, 2, 3)),
			false,
		)
	})

	test('monthly accepts end of month', () => {
		assert.equal(
			isValidFirstDiscountDate('monthly', utc(2026, 2, 31), utc(2026, 2, 3)),
			true,
		)
	})

	test('monthly rejects the 15th', () => {
		assert.equal(
			isValidFirstDiscountDate('monthly', utc(2026, 2, 15), utc(2026, 2, 3)),
			false,
		)
	})

	test('rejects date in the past', () => {
		assert.equal(
			isValidFirstDiscountDate('bi-monthly', utc(2026, 1, 15), utc(2026, 2, 3)),
			false,
		)
	})

	test('accepts date equal to today', () => {
		const today = utc(2026, 2, 15) // March 15 is the 15th
		assert.equal(isValidFirstDiscountDate('bi-monthly', today, today), true)
	})
})
