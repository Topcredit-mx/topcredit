import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { endOfDayInstantMexicoCity } from './calendar-date-tz'
import { formatMxDate } from './format-mx-date'

describe('formatMxDate', () => {
	test('uses Mexico City calendar for EOD instants (not the runtime TZ)', () => {
		const july31EodMx = endOfDayInstantMexicoCity('2026-07-31')
		const formatted = formatMxDate(july31EodMx)
		assert.match(formatted, /31/i)
		assert.match(formatted, /jul/i)
		assert.doesNotMatch(formatted, /ago/i)
	})

	test('formats YYYY-MM-DD with stable Mexico TZ (not UTC midnight shift)', () => {
		const formatted = formatMxDate('2026-05-31', { month: 'long' })
		assert.match(formatted, /31/i)
		assert.match(formatted, /may/i)
	})
})
