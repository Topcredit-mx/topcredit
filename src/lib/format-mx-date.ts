import { parseYmd } from './calendar-date-tz'

const LOCALE = 'es-MX'

const MEXICO_TZ = 'America/Mexico_City'

const MEXICO_STANDARD_OFFSET = '-06:00'

const DATE_ONLY_BASE: Omit<Intl.DateTimeFormatOptions, 'month'> = {
	timeZone: MEXICO_TZ,
	year: 'numeric',
	day: 'numeric',
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

function toDate(value: Date | string): Date {
	if (typeof value === 'string') {
		if (DATE_ONLY_RE.test(value.trim())) {
			const { year, month0, day } = parseYmd(value)
			const y = String(year).padStart(4, '0')
			const m = String(month0 + 1).padStart(2, '0')
			const d = String(day).padStart(2, '0')
			return new Date(`${y}-${m}-${d}T12:00:00.000${MEXICO_STANDARD_OFFSET}`)
		}
		return new Date(value)
	}
	return value
}

export type FormatMxDateOptions = {
	/** Default `short` (e.g. may); use `long` for full month names in labels. */
	month?: 'short' | 'long'
}

export function formatMxDate(
	value: Date | string,
	options?: FormatMxDateOptions,
): string {
	const month = options?.month ?? 'short'
	const intlOptions: Intl.DateTimeFormatOptions = {
		...DATE_ONLY_BASE,
		month,
	}
	return toDate(value).toLocaleDateString(LOCALE, intlOptions)
}
