const MEXICO_CITY = 'America/Mexico_City'

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
