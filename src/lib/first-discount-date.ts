import {
	calendarYmdInMexicoCity,
	endOfDayInstantMexicoCity,
	startOfDayInstantMexicoCity,
	utcMidnightForYmd,
} from '~/lib/calendar-date-tz'

type SalaryFrequency = 'bi-monthly' | 'monthly'

/** +1 calendar day in UTC (Mexico has no DST; safe for YMD line). */
function addOneCalendarDayYmd(ymd: string): string {
	const d = utcMidnightForYmd(ymd)
	d.setUTCDate(d.getUTCDate() + 1)
	return d.toISOString().slice(0, 10)
}

/**
 * YYYY-MM-DD of the business anchor for a `Date` (due / first discount).
 * Uses Mexico calendar; required when instants are end-of-day CDMX (UTC date may differ).
 */
function ymdOfScheduleDate(d: Date): string {
	return calendarYmdInMexicoCity(d)
}

/** Payroll anchor instant: 23:59:59.999 in `America/Mexico_City`. */
function scheduleFromYmd(ymd: string): Date {
	return endOfDayInstantMexicoCity(ymd)
}

function lastDayOfMonthYmd(year: number, month0: number): string {
	const last = new Date(Date.UTC(year, month0 + 1, 0))
	const d = last.getUTCDate()
	return `${String(year).padStart(4, '0')}-${String(month0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function lastDayOfMonthForYmd(ymd: string): { day: number; ymd: string } {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
	if (m == null) return { day: 31, ymd: '1970-01-31' }
	const year = Number(m[1])
	const month0 = Number(m[2]) - 1
	const y = lastDayOfMonthYmd(year, month0)
	return { day: Number(y.slice(8, 10)), ymd: y }
}

function ymdString(year: number, month0: number, day: number): string {
	return `${String(year).padStart(4, '0')}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isSameOrAfterYmd(a: string, b: string): boolean {
	return a >= b
}

/**
 * YYYY-MM-DD of the upcoming payroll anchor (Mexico), before converting to an EOD instant.
 */
export function getUpcomingDeductionAnchorYmd(
	frequency: SalaryFrequency,
	today: Date,
): string {
	const ymd = calendarYmdInMexicoCity(today)
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
	if (m == null) {
		return ymd
	}
	const year = Number(m[1])
	const month0 = Number(m[2]) - 1
	const day = Number(m[3])

	if (frequency === 'monthly') {
		return lastDayOfMonthYmd(year, month0)
	}

	const { ymd: eomYmd } = lastDayOfMonthForYmd(ymd)
	if (day <= 15) {
		return ymdString(year, month0, 15)
	}
	return eomYmd
}

/**
 * Upcoming payroll deduction anchor: **23:59:59.999** that calendar day in CDMX.
 */
export function getUpcomingDeductionDate(
	frequency: SalaryFrequency,
	today: Date,
): Date {
	return scheduleFromYmd(getUpcomingDeductionAnchorYmd(frequency, today))
}

/** Same Y-M-D as `getUpcomingDeductionAnchorYmd` (header / CSV, etc.). */
export function getUpcomingDeductionDateYmd(
	frequency: SalaryFrequency,
	today: Date,
): string {
	return getUpcomingDeductionAnchorYmd(frequency, today)
}

/** Strictly previous payroll anchor before `onOrBefore` (same calendar day allowed). */
function previousPayrollAnchorYmd(
	frequency: SalaryFrequency,
	onOrBeforeYmd: string,
): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(onOrBeforeYmd)
	if (m == null) return onOrBeforeYmd
	const year = Number(m[1])
	const month0 = Number(m[2]) - 1
	const day = Number(m[3])

	if (frequency === 'monthly') {
		if (month0 === 0) {
			return lastDayOfMonthYmd(year - 1, 11)
		}
		return lastDayOfMonthYmd(year, month0 - 1)
	}

	const { day: eomDay } = lastDayOfMonthForYmd(onOrBeforeYmd)
	if (day === 15) {
		if (month0 === 0) {
			return lastDayOfMonthYmd(year - 1, 11)
		}
		return lastDayOfMonthYmd(year, month0 - 1)
	}
	if (day === eomDay) {
		return ymdString(year, month0, 15)
	}
	if (month0 === 0) {
		return lastDayOfMonthYmd(year - 1, 11)
	}
	return lastDayOfMonthYmd(year, month0 - 1)
}

/**
 * Last completed payroll deduction date (Mexico calendar) relative to `today`.
 * The anchor strictly before `getUpcomingDeductionDate(frequency, today)`.
 */
export function getPastDeductionDate(
	frequency: SalaryFrequency,
	today: Date,
): Date {
	const upcomingYmd = getUpcomingDeductionDateYmd(frequency, today)
	const prevYmd = previousPayrollAnchorYmd(frequency, upcomingYmd)
	return scheduleFromYmd(prevYmd)
}

export type PayPeriodComparisonBounds = {
	currentStart: Date
	currentEnd: Date
	previousStart: Date
	previousEnd: Date
}

/**
 * Half-open windows [start, end) for comparing installment collections, aligned to
 * Mexico City payroll. `Start` is 00:00:00 that calendar day in CDMX; anchors are EOD CDMX.
 */
export function getPayPeriodComparisonBounds(
	frequency: SalaryFrequency,
	today: Date,
): PayPeriodComparisonBounds {
	const pastDeduction = getPastDeductionDate(frequency, today)
	const pastYmd = ymdOfScheduleDate(pastDeduction)
	const currentStart = startOfDayInstantMexicoCity(
		addOneCalendarDayYmd(pastYmd),
	)
	const currentEnd = today
	const anchorBeforePastYmd = previousPayrollAnchorYmd(frequency, pastYmd)
	const previousStart = startOfDayInstantMexicoCity(
		addOneCalendarDayYmd(anchorBeforePastYmd),
	)
	const previousEnd = currentStart
	return { currentStart, currentEnd, previousStart, previousEnd }
}

export function getValidFirstDiscountDates(
	frequency: SalaryFrequency,
	today: Date,
	count: number,
): Date[] {
	const todayYmd = calendarYmdInMexicoCity(today)
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayYmd)
	if (m == null) return []
	let year = Number(m[1])
	let month0 = Number(m[2]) - 1
	const day = Number(m[3])
	const dates: Date[] = []

	if (frequency === 'monthly') {
		let eomYmd = lastDayOfMonthYmd(year, month0)
		if (!isSameOrAfterYmd(eomYmd, todayYmd)) {
			month0 += 1
			if (month0 > 11) {
				month0 = 0
				year += 1
			}
			eomYmd = lastDayOfMonthYmd(year, month0)
		}
		while (dates.length < count) {
			const eom = lastDayOfMonthYmd(year, month0)
			if (isSameOrAfterYmd(eom, todayYmd)) {
				dates.push(scheduleFromYmd(eom))
			}
			month0 += 1
			if (month0 > 11) {
				month0 = 0
				year += 1
			}
		}
		return dates
	}

	let nextIs15th = day <= 15
	while (dates.length < count) {
		const candidateYmd = nextIs15th
			? ymdString(year, month0, 15)
			: lastDayOfMonthYmd(year, month0)

		if (isSameOrAfterYmd(candidateYmd, todayYmd)) {
			dates.push(scheduleFromYmd(candidateYmd))
		}

		if (!nextIs15th) {
			month0 += 1
			if (month0 > 11) {
				month0 = 0
				year += 1
			}
		}
		nextIs15th = !nextIs15th
	}

	return dates
}

export function isValidFirstDiscountDate(
	frequency: SalaryFrequency,
	date: Date,
	today: Date,
): boolean {
	const dateYmd = ymdOfScheduleDate(date)
	const todayYmd = calendarYmdInMexicoCity(today)
	if (!isSameOrAfterYmd(dateYmd, todayYmd)) {
		return false
	}

	return isFirstDiscountAnchorCalendarShapeValid(frequency, date)
}

/** Past/future: only calendar shape (month-end vs 15|EOM), no `date >= today` check. */
function lastDayOfMonthUTC(year: number, month0: number): Date {
	return new Date(Date.UTC(year, month0 + 1, 0))
}

/**
 * Date-only `timestamp` rows may be **UTC midnight** (legacy) or **EOD CDMX** (new).
 * Legacy: use the ISO `YYYY-MM-DD` slice. New: use Mexico City calendar.
 */
function anchorYmdForShapeValidation(d: Date): string {
	if (
		d.getUTCHours() === 0 &&
		d.getUTCMinutes() === 0 &&
		d.getUTCSeconds() === 0 &&
		d.getUTCMilliseconds() === 0
	) {
		return d.toISOString().slice(0, 10)
	}
	return calendarYmdInMexicoCity(d)
}

export function isFirstDiscountAnchorCalendarShapeValid(
	frequency: SalaryFrequency,
	date: Date,
): boolean {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchorYmdForShapeValidation(date))
	if (m == null) return false
	const year = Number(m[1])
	const month0 = Number(m[2]) - 1
	const day = Number(m[3])
	const eom = lastDayOfMonthUTC(year, month0)
	const isEndOfMonth = day === eom.getUTCDate()
	if (frequency === 'monthly') {
		return isEndOfMonth
	}
	return day === 15 || isEndOfMonth
}
