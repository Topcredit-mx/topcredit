import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
	calendarYmdInMexicoCity,
	endOfDayInstantMexicoCity,
	startOfDayInstantMexicoCity,
} from '~/lib/calendar-date-tz'
import {
	getPastDeductionDate,
	getPayPeriodComparisonBounds,
	getUpcomingDeductionAnchorYmd,
	getUpcomingDeductionDate,
	getUpcomingDeductionDateYmd,
	getValidFirstDiscountDates,
	isValidFirstDiscountDate,
} from '~/lib/first-discount-date'

/** Instant on a Mexico City calendar day (noon UTC = same civil date as CDMX, UTC-6). */
function mxYmdInstant(year: number, month0: number, day: number): Date {
	return new Date(Date.UTC(year, month0, day, 12, 0, 0, 0))
}

function ymdParts(year: number, month0: number, day: number): string {
	return `${String(year).padStart(4, '0')}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Due / anchor instant: 23:59:59.999 in Mexico City. */
function eodMx(year: number, month0: number, day: number): Date {
	return endOfDayInstantMexicoCity(ymdParts(year, month0, day))
}
/** Day boundary: 00:00:00 in Mexico City. */
function sodMx(year: number, month0: number, day: number): Date {
	return startOfDayInstantMexicoCity(ymdParts(year, month0, day))
}

describe('getUpcomingDeductionDate', () => {
	describe('bi-monthly', () => {
		test('early in month suggests the 15th of current month', () => {
			const today = mxYmdInstant(2026, 2, 3) // March 3
			const result = getUpcomingDeductionDate('bi-monthly', today)
			assert.deepEqual(result, eodMx(2026, 2, 15))
		})

		test('on the 15th suggests the 15th (same day)', () => {
			const today = mxYmdInstant(2026, 2, 15) // March 15
			const result = getUpcomingDeductionDate('bi-monthly', today)
			assert.deepEqual(result, eodMx(2026, 2, 15))
		})

		test('after the 15th suggests end of current month', () => {
			const today = mxYmdInstant(2026, 2, 16) // March 16
			const result = getUpcomingDeductionDate('bi-monthly', today)
			assert.deepEqual(result, eodMx(2026, 2, 31)) // March 31
		})

		test('on last day of month suggests that day', () => {
			const today = mxYmdInstant(2026, 2, 31) // March 31
			const result = getUpcomingDeductionDate('bi-monthly', today)
			assert.deepEqual(result, eodMx(2026, 2, 31))
		})

		test('after last day marker suggests 15th of next month', () => {
			const today = mxYmdInstant(2026, 3, 1) // April 1
			const result = getUpcomingDeductionDate('bi-monthly', today)
			assert.deepEqual(result, eodMx(2026, 3, 15)) // April 15
		})

		test('handles February (non-leap)', () => {
			const today = mxYmdInstant(2026, 1, 16) // Feb 16, 2026 (non-leap)
			const result = getUpcomingDeductionDate('bi-monthly', today)
			assert.deepEqual(result, eodMx(2026, 1, 28)) // Feb 28
		})

		test('handles February (leap year)', () => {
			const today = mxYmdInstant(2028, 1, 16) // Feb 16, 2028 (leap)
			const result = getUpcomingDeductionDate('bi-monthly', today)
			assert.deepEqual(result, eodMx(2028, 1, 29)) // Feb 29
		})
	})

	describe('monthly', () => {
		test('suggests end of current month when early in month', () => {
			const today = mxYmdInstant(2026, 2, 5) // March 5
			const result = getUpcomingDeductionDate('monthly', today)
			assert.deepEqual(result, eodMx(2026, 2, 31)) // March 31
		})

		test('on last day of month suggests that day', () => {
			const today = mxYmdInstant(2026, 2, 31) // March 31
			const result = getUpcomingDeductionDate('monthly', today)
			assert.deepEqual(result, eodMx(2026, 2, 31))
		})

		test('handles February', () => {
			const today = mxYmdInstant(2026, 1, 1) // Feb 1
			const result = getUpcomingDeductionDate('monthly', today)
			assert.deepEqual(result, eodMx(2026, 1, 28)) // Feb 28
		})

		test('handles December to stay in December', () => {
			const today = mxYmdInstant(2026, 11, 10) // Dec 10
			const result = getUpcomingDeductionDate('monthly', today)
			assert.deepEqual(result, eodMx(2026, 11, 31)) // Dec 31
		})
	})
})

describe('getUpcomingDeductionDateYmd', () => {
	test('matches getUpcomingDeductionAnchorYmd (Mexico Y-M-D)', () => {
		const today = mxYmdInstant(2026, 2, 5) // March 5
		assert.equal(
			getUpcomingDeductionDateYmd('monthly', today),
			getUpcomingDeductionAnchorYmd('monthly', today),
		)
	})
})

describe('getPastDeductionDate', () => {
	test('monthly mid-month returns last month-end', () => {
		const today = mxYmdInstant(2026, 2, 10) // March 10
		assert.deepEqual(getPastDeductionDate('monthly', today), eodMx(2026, 1, 28))
	})

	test('monthly on month-end returns previous month-end', () => {
		const today = mxYmdInstant(2026, 2, 31) // March 31
		assert.deepEqual(getPastDeductionDate('monthly', today), eodMx(2026, 1, 28))
	})

	test('bi-monthly before 15th returns previous month-end', () => {
		const today = mxYmdInstant(2026, 2, 10) // March 10
		assert.deepEqual(
			getPastDeductionDate('bi-monthly', today),
			eodMx(2026, 1, 28),
		)
	})

	test('bi-monthly after 15th returns the 15th of same month', () => {
		const today = mxYmdInstant(2026, 2, 20) // March 20
		assert.deepEqual(
			getPastDeductionDate('bi-monthly', today),
			eodMx(2026, 2, 15),
		)
	})

	test('bi-monthly on month-end returns the 15th of same month', () => {
		const today = mxYmdInstant(2026, 2, 31) // March 31
		assert.deepEqual(
			getPastDeductionDate('bi-monthly', today),
			eodMx(2026, 2, 15),
		)
	})
})

describe('getPayPeriodComparisonBounds', () => {
	test('monthly aligns current window to day after past deduction', () => {
		const today = mxYmdInstant(2026, 2, 10) // March 10
		const b = getPayPeriodComparisonBounds('monthly', today)
		assert.deepEqual(b.currentStart, sodMx(2026, 2, 1))
		assert.equal(b.currentEnd.getTime(), today.getTime())
		assert.deepEqual(b.previousStart, sodMx(2026, 1, 1))
		assert.deepEqual(b.previousEnd, sodMx(2026, 2, 1))
	})

	test('bi-monthly mid-first-half uses previous month-end as previous period start anchor', () => {
		const today = mxYmdInstant(2026, 2, 10) // March 10
		const b = getPayPeriodComparisonBounds('bi-monthly', today)
		assert.deepEqual(b.currentStart, sodMx(2026, 2, 1))
		assert.deepEqual(b.previousStart, sodMx(2026, 1, 16))
		assert.deepEqual(b.previousEnd, sodMx(2026, 2, 1))
	})
})

describe('getValidFirstDiscountDates', () => {
	test('bi-monthly returns alternating 15th and end-of-month', () => {
		const today = mxYmdInstant(2026, 2, 3) // March 3
		const dates = getValidFirstDiscountDates('bi-monthly', today, 4)
		assert.equal(dates.length, 4)
		assert.deepEqual(dates[0], eodMx(2026, 2, 15)) // Mar 15
		assert.deepEqual(dates[1], eodMx(2026, 2, 31)) // Mar 31
		assert.deepEqual(dates[2], eodMx(2026, 3, 15)) // Apr 15
		assert.deepEqual(dates[3], eodMx(2026, 3, 30)) // Apr 30
	})

	test('monthly returns consecutive month-ends', () => {
		const today = mxYmdInstant(2026, 2, 5) // March 5
		const dates = getValidFirstDiscountDates('monthly', today, 3)
		assert.equal(dates.length, 3)
		assert.deepEqual(dates[0], eodMx(2026, 2, 31)) // Mar 31
		assert.deepEqual(dates[1], eodMx(2026, 3, 30)) // Apr 30
		assert.deepEqual(dates[2], eodMx(2026, 4, 31)) // May 31
	})

	test('bi-monthly starting after the 15th skips to month-end first', () => {
		const today = mxYmdInstant(2026, 2, 20) // March 20
		const dates = getValidFirstDiscountDates('bi-monthly', today, 3)
		assert.deepEqual(dates[0], eodMx(2026, 2, 31)) // Mar 31
		assert.deepEqual(dates[1], eodMx(2026, 3, 15)) // Apr 15
		assert.deepEqual(dates[2], eodMx(2026, 3, 30)) // Apr 30
	})

	test('no dates earlier than today', () => {
		const today = mxYmdInstant(2026, 2, 31) // March 31
		const todayYmd = calendarYmdInMexicoCity(today)
		const dates = getValidFirstDiscountDates('bi-monthly', today, 3)
		for (const d of dates) {
			const y = d.toISOString().slice(0, 10)
			assert.ok(
				y >= todayYmd,
				`${y} should not be before Mexico calendar day ${todayYmd}`,
			)
		}
	})

	test('monthly when today is last day of month includes today', () => {
		const today = mxYmdInstant(2026, 2, 31) // March 31
		const dates = getValidFirstDiscountDates('monthly', today, 3)
		assert.deepEqual(dates[0], eodMx(2026, 2, 31)) // Mar 31
		assert.deepEqual(dates[1], eodMx(2026, 3, 30)) // Apr 30
		assert.deepEqual(dates[2], eodMx(2026, 4, 31)) // May 31
	})

	test('bi-monthly when today is the 15th includes the 15th', () => {
		const today = mxYmdInstant(2026, 2, 15) // March 15
		const dates = getValidFirstDiscountDates('bi-monthly', today, 4)
		assert.deepEqual(dates[0], eodMx(2026, 2, 15)) // Mar 15
		assert.deepEqual(dates[1], eodMx(2026, 2, 31)) // Mar 31
		assert.deepEqual(dates[2], eodMx(2026, 3, 15)) // Apr 15
		assert.deepEqual(dates[3], eodMx(2026, 3, 30)) // Apr 30
	})

	test('bi-monthly when today is last day includes that day', () => {
		const today = mxYmdInstant(2026, 2, 31) // March 31
		const dates = getValidFirstDiscountDates('bi-monthly', today, 3)
		assert.deepEqual(dates[0], eodMx(2026, 2, 31)) // Mar 31
		assert.deepEqual(dates[1], eodMx(2026, 3, 15)) // Apr 15
		assert.deepEqual(dates[2], eodMx(2026, 3, 30)) // Apr 30
	})

	test('monthly handles December to January year rollover', () => {
		const today = mxYmdInstant(2026, 11, 1) // Dec 1
		const dates = getValidFirstDiscountDates('monthly', today, 3)
		assert.deepEqual(dates[0], eodMx(2026, 11, 31)) // Dec 31
		assert.deepEqual(dates[1], eodMx(2027, 0, 31)) // Jan 31
		assert.deepEqual(dates[2], eodMx(2027, 1, 28)) // Feb 28
	})

	test('bi-monthly handles December to January year rollover', () => {
		const today = mxYmdInstant(2026, 11, 16) // Dec 16
		const dates = getValidFirstDiscountDates('bi-monthly', today, 4)
		assert.deepEqual(dates[0], eodMx(2026, 11, 31)) // Dec 31
		assert.deepEqual(dates[1], eodMx(2027, 0, 15)) // Jan 15
		assert.deepEqual(dates[2], eodMx(2027, 0, 31)) // Jan 31
		assert.deepEqual(dates[3], eodMx(2027, 1, 15)) // Feb 15
	})

	test('monthly handles February (non-leap year)', () => {
		const today = mxYmdInstant(2026, 1, 1) // Feb 1, 2026
		const dates = getValidFirstDiscountDates('monthly', today, 2)
		assert.deepEqual(dates[0], eodMx(2026, 1, 28)) // Feb 28
		assert.deepEqual(dates[1], eodMx(2026, 2, 31)) // Mar 31
	})

	test('monthly handles February (leap year)', () => {
		const today = mxYmdInstant(2028, 1, 1) // Feb 1, 2028 (leap)
		const dates = getValidFirstDiscountDates('monthly', today, 2)
		assert.deepEqual(dates[0], eodMx(2028, 1, 29)) // Feb 29
		assert.deepEqual(dates[1], eodMx(2028, 2, 31)) // Mar 31
	})

	test('bi-monthly handles February end (non-leap)', () => {
		const today = mxYmdInstant(2026, 1, 16) // Feb 16, 2026
		const dates = getValidFirstDiscountDates('bi-monthly', today, 3)
		assert.deepEqual(dates[0], eodMx(2026, 1, 28)) // Feb 28
		assert.deepEqual(dates[1], eodMx(2026, 2, 15)) // Mar 15
		assert.deepEqual(dates[2], eodMx(2026, 2, 31)) // Mar 31
	})

	test('returns requested count of 1', () => {
		const today = mxYmdInstant(2026, 2, 3)
		const dates = getValidFirstDiscountDates('monthly', today, 1)
		assert.equal(dates.length, 1)
		assert.deepEqual(dates[0], eodMx(2026, 2, 31))
	})

	test('monthly when today is day after month-end advances to next month', () => {
		const today = mxYmdInstant(2026, 3, 1) // April 1 (March ended Mar 31)
		const dates = getValidFirstDiscountDates('monthly', today, 2)
		assert.deepEqual(dates[0], eodMx(2026, 3, 30)) // Apr 30
		assert.deepEqual(dates[1], eodMx(2026, 4, 31)) // May 31
	})
})

describe('isValidFirstDiscountDate', () => {
	test('bi-monthly accepts the 15th', () => {
		assert.equal(
			isValidFirstDiscountDate(
				'bi-monthly',
				mxYmdInstant(2026, 2, 15),
				mxYmdInstant(2026, 2, 3),
			),
			true,
		)
	})

	test('bi-monthly accepts end of month', () => {
		assert.equal(
			isValidFirstDiscountDate(
				'bi-monthly',
				mxYmdInstant(2026, 2, 31),
				mxYmdInstant(2026, 2, 3),
			),
			true,
		)
	})

	test('bi-monthly rejects arbitrary date', () => {
		assert.equal(
			isValidFirstDiscountDate(
				'bi-monthly',
				mxYmdInstant(2026, 2, 20),
				mxYmdInstant(2026, 2, 3),
			),
			false,
		)
	})

	test('monthly accepts end of month', () => {
		assert.equal(
			isValidFirstDiscountDate(
				'monthly',
				mxYmdInstant(2026, 2, 31),
				mxYmdInstant(2026, 2, 3),
			),
			true,
		)
	})

	test('monthly rejects the 15th', () => {
		assert.equal(
			isValidFirstDiscountDate(
				'monthly',
				mxYmdInstant(2026, 2, 15),
				mxYmdInstant(2026, 2, 3),
			),
			false,
		)
	})

	test('rejects date in the past', () => {
		assert.equal(
			isValidFirstDiscountDate(
				'bi-monthly',
				mxYmdInstant(2026, 1, 15),
				mxYmdInstant(2026, 2, 3),
			),
			false,
		)
	})

	test('accepts date equal to today', () => {
		const today = mxYmdInstant(2026, 2, 15) // March 15 is the 15th
		assert.equal(isValidFirstDiscountDate('bi-monthly', today, today), true)
	})

	test('accepts payroll anchor YMD when parsed as EOD Mexico City', () => {
		const today = mxYmdInstant(2026, 4, 1)
		const anchorYmd = '2026-05-31'
		assert.equal(
			isValidFirstDiscountDate(
				'monthly',
				endOfDayInstantMexicoCity(anchorYmd),
				today,
			),
			true,
		)
		assert.equal(
			isValidFirstDiscountDate('monthly', new Date(anchorYmd), today),
			false,
		)
	})
})
