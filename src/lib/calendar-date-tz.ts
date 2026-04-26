/** US Central Standard Time: business calendar is fixed UTC-6 (matches IANA post-~2022; avoids skew vs {@link endOfDayInstantMexicoCity}). */
const MEXICO_STANDARD_OFFSET = '-06:00'
const MEXICO_STANDARD_OFFSET_MS = 6 * 60 * 60 * 1000

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
 * A UTC `Date` at 00:00:00 **UTC** for a calendar `YYYY-MM-DD` (tests / utilities).
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

/** Business calendar Y-M-D for a `dueDate` (EOD `America/Mexico_City` instant). */
export function ymdForDeductionSchedule(d: Date): string {
	// `dueDate` = EOD Mexico for that YMD; YMD of instant matches business calendar
	return calendarYmdInMexicoCity(d)
}

/**
 * Civil `YYYY-MM-DD` for business logic, using the same fixed **UTC-6** offset as
 * {@link startOfDayInstantMexicoCity} / {@link endOfDayInstantMexicoCity}.
 * (IANA `America/Mexico_City` can disagree on historical instants, which would make
 * EOD instants and YMD string round-trips disagree.)
 */
export function calendarYmdInMexicoCity(d: Date): string {
	if (Number.isNaN(d.getTime())) {
		return d.toISOString().slice(0, 10)
	}
	const localAsUtc = new Date(d.getTime() - MEXICO_STANDARD_OFFSET_MS)
	const y = localAsUtc.getUTCFullYear()
	const m0 = localAsUtc.getUTCMonth() + 1
	const day = localAsUtc.getUTCDate()
	return `${String(y).padStart(4, '0')}-${String(m0).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
