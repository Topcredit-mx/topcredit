import assert from 'node:assert/strict'
import { test } from 'node:test'
import { calendarYmdInMexicoCity } from './calendar-date-tz'

test('calendarYmdInMexicoCity matches format YYYY-MM-DD for CDMX', () => {
	const d = new Date('2022-12-01T05:00:00.000Z')
	assert.equal(calendarYmdInMexicoCity(d), '2022-11-30')
})
