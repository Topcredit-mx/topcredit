import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
	calendarYmdInMexicoCity,
	endOfDayInstantMexicoCity,
	subtractCalendarDays,
	utcMidnightForYmd,
} from './calendar-date-tz'

test('calendarYmdInMexicoCity matches format YYYY-MM-DD for CDMX', () => {
	const d = new Date('2022-12-01T05:00:00.000Z')
	assert.equal(calendarYmdInMexicoCity(d), '2022-11-30')
})

test('utcMidnightForYmd and stored due_date toISOString slice stay consistent', () => {
	const ymd = '2026-01-15'
	const d = utcMidnightForYmd(ymd)
	assert.equal(d.toISOString().slice(0, 10), ymd)
})

test('endOfDayInstantMexicoCity is 23:59:59.999-06:00 for Y-M-D', () => {
	const d = endOfDayInstantMexicoCity('2026-01-15')
	assert.equal(d.toISOString(), '2026-01-16T05:59:59.999Z')
})

test('subtractCalendarDays crosses month boundary', () => {
	assert.equal(subtractCalendarDays('2023-03-05', 10), '2023-02-23')
})

test('subtractCalendarDays rejects negative days', () => {
	assert.throws(() => subtractCalendarDays('2023-01-10', -1), RangeError)
})
