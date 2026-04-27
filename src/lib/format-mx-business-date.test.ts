import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { endOfDayInstantMexicoCity } from './calendar-date-tz'
import { formatMxBusinessDate } from './format-mx-business-date'

describe('formatMxBusinessDate', () => {
	test('uses Mexico City calendar for EOD instants (not the runtime TZ)', () => {
		const july31EodMx = endOfDayInstantMexicoCity('2026-07-31')
		const formatted = formatMxBusinessDate(july31EodMx)
		assert.match(formatted, /31/i)
		assert.match(formatted, /jul/i)
		assert.doesNotMatch(formatted, /ago/i)
	})
})
