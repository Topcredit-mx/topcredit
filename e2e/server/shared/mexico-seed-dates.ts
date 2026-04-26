import {
	calendarYmdInMexicoCity,
	endOfDayInstantMexicoCity,
	parseYmd,
	startOfDayInstantMexicoCity,
	todayYmdMexicoCity,
} from '~/lib/calendar-date-tz'

/**
 * E2E / seed helpers: business dates use the same **fixed UTC-6** + EOD
 * semantics as production (`endOfDayInstantMexicoCity`).
 *
 * Do not use `Date.UTC(y, m, lastDay)` alone for `firstDiscountDate` / `dueDate`.
 */

function lastDayYmdInMonthUTC(year: number, month0: number): string {
	const last = new Date(Date.UTC(year, month0 + 1, 0))
	return `${String(last.getUTCFullYear()).padStart(4, '0')}-${String(
		last.getUTCMonth() + 1,
	).padStart(2, '0')}-${String(last.getUTCDate()).padStart(2, '0')}`
}

/** Last calendar day of the **Mexico business month** that contains `now`. */
export function endOfCurrentMonthEodMx(now: Date): Date {
	const ymd = todayYmdMexicoCity(now)
	const { year, month0 } = parseYmd(ymd)
	return endOfDayInstantMexicoCity(lastDayYmdInMonthUTC(year, month0))
}

/** Last day of the **next** calendar month in Mexico, relative to `now`. */
export function endOfNextMonthEodMx(now: Date): Date {
	const ymd = todayYmdMexicoCity(now)
	const { year, month0 } = parseYmd(ymd)
	const firstNext = new Date(Date.UTC(year, month0 + 1, 1))
	return endOfDayInstantMexicoCity(
		lastDayYmdInMonthUTC(firstNext.getUTCFullYear(), firstNext.getUTCMonth()),
	)
}

/**
 * End of the **previous** calendar month in Mexico, relative to the Mexico
 * civil date of `now` (e.g. Jan 5 → previous month = Dec, last day 31).
 */
export function endOfPreviousMonthEodMx(now: Date): Date {
	const ymd = todayYmdMexicoCity(now)
	const { year, month0 } = parseYmd(ymd)
	const anchor = new Date(Date.UTC(year, month0, 1))
	const lastPrev = new Date(anchor)
	lastPrev.setUTCDate(0)
	return endOfDayInstantMexicoCity(
		lastDayYmdInMonthUTC(lastPrev.getUTCFullYear(), lastPrev.getUTCMonth()),
	)
}

/** Nth day (1–31) of the **previous** Mexico month relative to `now`. */
export function dayOfPreviousMonthEodMx(now: Date, day: number): Date {
	const ymd = todayYmdMexicoCity(now)
	const { year, month0 } = parseYmd(ymd)
	const prev = new Date(Date.UTC(year, month0, 0)) // last day of prev month
	const py = prev.getUTCFullYear()
	const pm0 = prev.getUTCMonth()
	const d = String(day).padStart(2, '0')
	const m = String(pm0 + 1).padStart(2, '0')
	const y = String(py).padStart(4, '0')
	return endOfDayInstantMexicoCity(`${y}-${m}-${d}`)
}

/**
 * EOM a given number of **whole months** before the Mexico month containing `now`
 * (e.g. 2 months ago EOM: from March → end of January).
 */
export function endOfMonthMonthsAgoEodMx(now: Date, monthsBack: number): Date {
	const ymd = todayYmdMexicoCity(now)
	const { year, month0 } = parseYmd(ymd)
	const d = new Date(Date.UTC(year, month0 - monthsBack, 1))
	return endOfDayInstantMexicoCity(
		lastDayYmdInMonthUTC(d.getUTCFullYear(), d.getUTCMonth()),
	)
}

/** Calendar day in Mexico, minus `n` civil days, as EOD Mexico. */
export function eodBusinessDaysAgo(now: Date, n: number): Date {
	const ymd = todayYmdMexicoCity(now)
	const { year, month0, day } = parseYmd(ymd)
	const noonUtc = new Date(Date.UTC(year, month0, day, 12, 0, 0, 0))
	const shifted = new Date(noonUtc.getTime() - n * 86_400_000)
	return endOfDayInstantMexicoCity(calendarYmdInMexicoCity(shifted))
}

/**
 * EOD of the Mexico civil date that is `n` **days** from Mexico “today”
 * (positive = future, negative = past).
 */
export function eodNCalendarDaysFromMexicoToday(now: Date, n: number): Date {
	const ymd = todayYmdMexicoCity(now)
	const { year, month0, day } = parseYmd(ymd)
	const noonUtc = new Date(Date.UTC(year, month0, day, 12, 0, 0, 0))
	const shifted = new Date(noonUtc.getTime() + n * 86_400_000)
	return endOfDayInstantMexicoCity(calendarYmdInMexicoCity(shifted))
}

/**
 * Nth day of a month offset from the Mexico "today" month (e.g. -1 = previous
 * month), clamped to that month's length (e.g. day 30 in February).
 */
export function eodDayOfOffsetMexicoMonth(
	now: Date,
	monthOffset: number,
	day: number,
): Date {
	const ymd = todayYmdMexicoCity(now)
	const { year, month0 } = parseYmd(ymd)
	const first = new Date(Date.UTC(year, month0 + monthOffset, 1))
	const y2 = first.getUTCFullYear()
	const m2 = first.getUTCMonth()
	const lastD = new Date(Date.UTC(y2, m2 + 1, 0)).getUTCDate()
	const d = Math.min(day, lastD)
	return endOfDayInstantMexicoCity(
		`${String(y2).padStart(4, '0')}-${String(m2 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
	)
}

/**
 * EOD for a Y-M-D (used for static frozen-clock fixtures like `2019-01-31`).
 */
export function eodYmd(ymd: string): Date {
	return endOfDayInstantMexicoCity(ymd)
}

/**
 * SOD for a Y-M-D (HR confirmation “same Mexico day as due” edge cases).
 */
export function sodYmd(ymd: string): Date {
	return startOfDayInstantMexicoCity(ymd)
}

/** Business Y-M-D for CSV / labels (not `toISOString().slice(0, 10)` on EOD instants). */
export function businessDueDateIso(d: Date): string {
	return calendarYmdInMexicoCity(d)
}
