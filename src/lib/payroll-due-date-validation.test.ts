import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { endOfDayInstantMexicoCity } from '~/lib/calendar-date-tz'
import {
	assertValidPayrollDueDates,
	findPayrollDueDateValidationIssue,
} from '~/lib/payroll-due-date-validation'

function eod(ymd: string): Date {
	return endOfDayInstantMexicoCity(ymd)
}

describe('findPayrollDueDateValidationIssue', () => {
	test('accepts monthly month-end dates in different months', () => {
		const issue = findPayrollDueDateValidationIssue('monthly', [
			eod('2022-11-30'),
			eod('2022-12-31'),
			eod('2023-01-31'),
		])
		assert.equal(issue, null)
	})

	test('rejects two different days in the same monthly payroll month', () => {
		const issue = findPayrollDueDateValidationIssue('monthly', [
			eod('2022-12-31'),
			eod('2022-12-28'),
		])
		assert.notEqual(issue, null)
		if (issue?.code !== 'conflicting_period_dates') {
			throw new Error('expected conflicting_period_dates')
		}
		assert.equal(issue.period, '2022-12')
	})

	test('rejects non-month-end dates for monthly frequency', () => {
		const issue = findPayrollDueDateValidationIssue('monthly', [
			eod('2022-12-15'),
		])
		assert.notEqual(issue, null)
		if (issue?.code !== 'invalid_anchor_shape') {
			throw new Error('expected invalid_anchor_shape')
		}
	})

	test('accepts bi-monthly 15th and month-end in the same calendar month', () => {
		const issue = findPayrollDueDateValidationIssue('bi-monthly', [
			eod('2022-12-15'),
			eod('2022-12-31'),
		])
		assert.equal(issue, null)
	})

	test('rejects duplicate bi-monthly anchors on different days', () => {
		const issue = findPayrollDueDateValidationIssue('bi-monthly', [
			eod('2022-12-15'),
			eod('2022-12-16'),
		])
		assert.notEqual(issue, null)
		if (issue?.code !== 'invalid_anchor_shape') {
			throw new Error('expected invalid_anchor_shape')
		}
	})
})

describe('assertValidPayrollDueDates', () => {
	test('throws with a readable message for conflicting monthly dates', () => {
		assert.throws(
			() =>
				assertValidPayrollDueDates('monthly', [
					eod('2022-12-31'),
					eod('2022-12-28'),
				]),
			/conflicting monthly payroll dates in period 2022-12/i,
		)
	})
})
