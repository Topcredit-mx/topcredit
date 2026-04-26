import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calendarYmdInMexicoCity, utcMidnightForYmd } from './calendar-date-tz'

test('calendarYmdInMexicoCity matches format YYYY-MM-DD for CDMX', () => {
	const d = new Date('2022-12-01T05:00:00.000Z')
	assert.equal(calendarYmdInMexicoCity(d), '2022-11-30')
})

test('utcMidnightForYmd and stored due_date toISOString slice stay consistent', () => {
	const ymd = '2026-01-15'
	const d = utcMidnightForYmd(ymd)
	assert.equal(d.toISOString().slice(0, 10), ymd)
})
