const LOCALE = 'es-MX'

const MEXICO_TZ = 'America/Mexico_City'

const DATE_ONLY_OPTIONS: Intl.DateTimeFormatOptions = {
	timeZone: MEXICO_TZ,
	year: 'numeric',
	month: 'short',
	day: 'numeric',
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

function toDate(value: Date | string): Date {
	if (typeof value === 'string') {
		if (DATE_ONLY_RE.test(value)) {
			const parts = value.split('-').map(Number)
			return new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1)
		}
		return new Date(value)
	}
	return value
}

export function formatMxBusinessDate(value: Date | string): string {
	return toDate(value).toLocaleDateString(LOCALE, DATE_ONLY_OPTIONS)
}
