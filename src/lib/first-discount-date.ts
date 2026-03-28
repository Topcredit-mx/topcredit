type SalaryFrequency = 'bi-monthly' | 'monthly'

function lastDayOfMonth(year: number, month: number): Date {
	return new Date(year, month + 1, 0)
}

function isSameOrAfter(date: Date, reference: Date): boolean {
	return date >= reference
}

export function suggestFirstDiscountDate(
	frequency: SalaryFrequency,
	today: Date,
): Date {
	const year = today.getFullYear()
	const month = today.getMonth()
	const day = today.getDate()

	if (frequency === 'monthly') {
		const monthEnd = lastDayOfMonth(year, month)
		return monthEnd
	}

	// bi-monthly: 15th or last day of month
	if (day <= 15) {
		return new Date(year, month, 15)
	}
	return lastDayOfMonth(year, month)
}

export function getValidFirstDiscountDates(
	frequency: SalaryFrequency,
	today: Date,
	count: number,
): Date[] {
	const dates: Date[] = []
	let year = today.getFullYear()
	let month = today.getMonth()
	const day = today.getDate()

	if (frequency === 'monthly') {
		// Start from current month's end if it's today or later
		let cursor = lastDayOfMonth(year, month)
		if (!isSameOrAfter(cursor, today)) {
			month += 1
			cursor = lastDayOfMonth(year + Math.floor(month / 12), month % 12)
		}
		while (dates.length < count) {
			const endOfMonth = lastDayOfMonth(year, month)
			if (isSameOrAfter(endOfMonth, today)) {
				dates.push(endOfMonth)
			}
			month += 1
			if (month > 11) {
				month = 0
				year += 1
			}
		}
		return dates
	}

	// bi-monthly: alternate between 15th and end-of-month
	// Find the first valid date >= today
	let nextIs15th = day <= 15

	while (dates.length < count) {
		const candidate = nextIs15th
			? new Date(year, month, 15)
			: lastDayOfMonth(year, month)

		if (isSameOrAfter(candidate, today)) {
			dates.push(candidate)
		}

		if (!nextIs15th) {
			// Move to next month
			month += 1
			if (month > 11) {
				month = 0
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
	if (!isSameOrAfter(date, today)) {
		return false
	}

	const year = date.getFullYear()
	const month = date.getMonth()
	const day = date.getDate()
	const endOfMonth = lastDayOfMonth(year, month)
	const isEndOfMonth = day === endOfMonth.getDate()

	if (frequency === 'monthly') {
		return isEndOfMonth
	}

	// bi-monthly: 15th or end of month
	return day === 15 || isEndOfMonth
}
