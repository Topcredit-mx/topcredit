import { calendarYmdInMexicoCity } from '~/lib/calendar-date-tz'
import { isFirstDiscountAnchorCalendarShapeValid } from '~/lib/first-discount-date'

export type SalaryFrequency = 'monthly' | 'bi-monthly'

export type PayrollDueDateValidationIssue =
	| { code: 'invalid_anchor_shape'; ymd: string }
	| {
			code: 'conflicting_period_dates'
			period: string
			ymdA: string
			ymdB: string
	  }

function payrollPeriodKey(frequency: SalaryFrequency, ymd: string): string {
	if (frequency === 'monthly') {
		return ymd.slice(0, 7)
	}
	return ymd
}

export function findPayrollDueDateValidationIssue(
	frequency: SalaryFrequency,
	dueDates: readonly Date[],
): PayrollDueDateValidationIssue | null {
	const byPeriod = new Map<string, string>()

	for (const due of dueDates) {
		const ymd = calendarYmdInMexicoCity(due)
		const period = payrollPeriodKey(frequency, ymd)
		const existing = byPeriod.get(period)
		if (existing !== undefined && existing !== ymd) {
			return {
				code: 'conflicting_period_dates',
				period,
				ymdA: existing,
				ymdB: ymd,
			}
		}
		byPeriod.set(period, ymd)
	}

	for (const due of dueDates) {
		const ymd = calendarYmdInMexicoCity(due)
		if (!isFirstDiscountAnchorCalendarShapeValid(frequency, due)) {
			return { code: 'invalid_anchor_shape', ymd }
		}
	}

	return null
}

export function assertValidPayrollDueDates(
	frequency: SalaryFrequency,
	dueDates: readonly Date[],
): void {
	const issue = findPayrollDueDateValidationIssue(frequency, dueDates)
	if (issue === null) {
		return
	}

	if (issue.code === 'invalid_anchor_shape') {
		throw new Error(
			`Invalid payroll due date ${issue.ymd} for ${frequency} frequency`,
		)
	}

	throw new Error(
		`Conflicting ${frequency} payroll dates in period ${issue.period}: ${issue.ymdA} vs ${issue.ymdB}`,
	)
}
