import {
	calendarYmdInMexicoCity,
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
 * YYYY-MM-DD for a schedule `Date` in DB (stored as UTC midnight; same as
 * `toISOString().slice(0, 10)`). Do not use `calendarYmdInMexicoCity` here or
 * month boundaries shift vs the stored value.
 */
function ymdOfScheduleDate(d: Date): string {
	return d.toISOString().slice(0, 10)
}

/** Stored schedule anchors use date-only = UTC midnight (matches `toISOString().slice(0,10)`). */
function scheduleFromYmd(ymd: string): Date {
	return utcMidnightForYmd(ymd)
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
 * Upcoming payroll deduction anchor in `America/Mexico_City` (15th, month-end, or
 * last day of month for monthly). Returned `Date` is midnight-equivalent in CDMX
 * (stored as UTC+6h in `Date` for the calendar day).
 */
export function getUpcomingDeductionDate(
	frequency: SalaryFrequency,
	today: Date,
): Date {
	const ymd = calendarYmdInMexicoCity(today)
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
	if (m == null) {
		return scheduleFromYmd(ymd)
	}
	const year = Number(m[1])
	const month0 = Number(m[2]) - 1
	const day = Number(m[3])

	if (frequency === 'monthly') {
		const eom = lastDayOfMonthYmd(year, month0)
		return scheduleFromYmd(eom)
	}

	const { ymd: eomYmd } = lastDayOfMonthForYmd(ymd)
	if (day <= 15) {
		return scheduleFromYmd(ymdString(year, month0, 15))
	}
	return scheduleFromYmd(eomYmd)
}

/** Calendar date (YYYY-MM-DD) for the upcoming payroll deduction (Mexico City). */
export function getUpcomingDeductionDateYmd(
	frequency: SalaryFrequency,
	today: Date,
): string {
	return ymdOfScheduleDate(getUpcomingDeductionDate(frequency, today))
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
 * Mexico City payroll deduction dates. Cutoff instants are UTC midnights at
 * the day boundary after each anchor.
 */
export function getPayPeriodComparisonBounds(
	frequency: SalaryFrequency,
	today: Date,
): PayPeriodComparisonBounds {
	const pastDeduction = getPastDeductionDate(frequency, today)
	const pastYmd = ymdOfScheduleDate(pastDeduction)
	const currentStart = utcMidnightForYmd(addOneCalendarDayYmd(pastYmd))
	const currentEnd = today
	const anchorBeforePastYmd = previousPayrollAnchorYmd(frequency, pastYmd)
	const previousStart = utcMidnightForYmd(
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

export function isFirstDiscountAnchorCalendarShapeValid(
	frequency: SalaryFrequency,
	date: Date,
): boolean {
	const year = date.getUTCFullYear()
	const month0 = date.getUTCMonth()
	const day = date.getUTCDate()
	const eom = lastDayOfMonthUTC(year, month0)
	const isEndOfMonth = day === eom.getUTCDate()
	if (frequency === 'monthly') {
		return isEndOfMonth
	}
	return day === 15 || isEndOfMonth
}
