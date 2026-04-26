const MEXICO_CITY = 'America/Mexico_City'
/** US Central Standard Time: Mexico (most spots) is UTC-6 (no US DST in `America/Mexico_City`). */
const MEXICO_STANDARD_OFFSET = '-06:00'

export function parseYmd(ymd: string): {
	year: number
	month0: number
	day: number
} {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
	if (m == null) {
		return { year: 1970, month0: 0, day: 1 }
	}
	return {
		year: Number(m[1]),
		month0: Number(m[2]) - 1,
		day: Number(m[3]),
	}
}

/** Calendar date in Mexico City, split into 0-based month index. */
export function calendarPartsInMexicoCity(d: Date): {
	year: number
	month0: number
	day: number
} {
	const ymd = calendarYmdInMexicoCity(d)
	return parseYmd(ymd)
}

/** `todayYmd` / alias for `calendarYmdInMexicoCity` (business "today" in CDMX). */
export function todayYmdMexicoCity(now: Date): string {
	return calendarYmdInMexicoCity(now)
}

/**
 * A UTC `Date` at 00:00:00 **UTC** for a calendar `YYYY-MM-DD` (legacy / tests only).
 * Prefer {@link endOfDayInstantMexicoCity} for `due_date` and payroll anchors.
 */
export function utcMidnightForYmd(ymd: string): Date {
	const { year, month0, day } = parseYmd(ymd)
	return new Date(Date.UTC(year, month0, day, 0, 0, 0, 0))
}

/** Start of calendar day (00:00:00) in `America/Mexico_City` as a UTC `Date` instant. */
export function startOfDayInstantMexicoCity(ymd: string): Date {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd.trim())) {
		return utcMidnightForYmd(ymd)
	}
	return new Date(`${ymd.trim()}T00:00:00.000${MEXICO_STANDARD_OFFSET}`)
}

/**
 * End of calendar day (23:59:59.999) in `America/Mexico_City` as a UTC `Date` instant.
 * Use for `due_date` and first-discount anchors so "on time" is `confirm <= this`.
 */
export function endOfDayInstantMexicoCity(ymd: string): Date {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd.trim())) {
		return utcMidnightForYmd(ymd)
	}
	return new Date(`${ymd.trim()}T23:59:59.999${MEXICO_STANDARD_OFFSET}`)
}

/** Business calendar Y for a `dueDate` (deduction EOD in Mexico, or legacy UTC midnight). */
export function ymdForDeductionSchedule(d: Date): string {
	// `dueDate` = EOD Mexico for that YMD; YMD of instant matches business calendar
	return calendarYmdInMexicoCity(d)
}

export function calendarYmdInMexicoCity(d: Date): string {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: MEXICO_CITY,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(d)

	const year = parts.find((p) => p.type === 'year')?.value
	const month = parts.find((p) => p.type === 'month')?.value
	const day = parts.find((p) => p.type === 'day')?.value

	if (
		year === undefined ||
		month === undefined ||
		day === undefined ||
		year.length === 0 ||
		month.length === 0 ||
		day.length === 0
	) {
		return d.toISOString().slice(0, 10)
	}

	return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}
