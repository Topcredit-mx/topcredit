/** US Central Standard Time: Mexico calendar instants use fixed UTC-6 (matches IANA post-~2022; avoids skew vs {@link endOfDayInstantMexicoCity}). */
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

/** `todayYmd` / alias for `calendarYmdInMexicoCity` (today’s civil date in CDMX). */
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

const YMD_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/

/** Pure calendar arithmetic on `YYYY-MM-DD` (no timezone shift). */
export function subtractCalendarDays(ymd: string, days: number): string {
	if (!Number.isFinite(days) || days < 0) {
		throw new RangeError(
			`subtractCalendarDays: days must be a non-negative finite number, got ${String(days)}`,
		)
	}
	const t = ymd.trim()
	if (!YMD_INPUT_RE.test(t)) {
		throw new RangeError(
			`subtractCalendarDays: expected YYYY-MM-DD, got "${ymd}"`,
		)
	}
	const { year, month0, day } = parseYmd(t)
	const d = new Date(Date.UTC(year, month0, day))
	d.setUTCDate(d.getUTCDate() - days)
	const y = d.getUTCFullYear()
	const m0 = d.getUTCMonth() + 1
	const dd = d.getUTCDate()
	return `${String(y).padStart(4, '0')}-${String(m0).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
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

/** Y-M-D in Mexico (fixed UTC-6) for a schedule `dueDate` (EOD CDMX instant). */
export function ymdForDeductionSchedule(d: Date): string {
	return calendarYmdInMexicoCity(d)
}

/**
 * Civil `YYYY-MM-DD` in Mexico, using the same fixed **UTC-6** offset as
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
