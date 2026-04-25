type SalaryFrequency = 'bi-monthly' | 'monthly'

function utcDate(year: number, month: number, day: number): Date {
	return new Date(Date.UTC(year, month, day))
}

function lastDayOfMonthUTC(year: number, month: number): Date {
	return new Date(Date.UTC(year, month + 1, 0))
}

function isSameOrAfter(date: Date, reference: Date): boolean {
	return date >= reference
}

export function getUpcomingDeductionDate(
	frequency: SalaryFrequency,
	today: Date,
): Date {
	const year = today.getUTCFullYear()
	const month = today.getUTCMonth()
	const day = today.getUTCDate()

	if (frequency === 'monthly') {
		return lastDayOfMonthUTC(year, month)
	}

	// bi-monthly: 15th or last day of month
	if (day <= 15) {
		return utcDate(year, month, 15)
	}
	return lastDayOfMonthUTC(year, month)
}

/** Calendar date (YYYY-MM-DD) for the upcoming payroll deduction, UTC. */
export function getUpcomingDeductionDateYmd(
	frequency: SalaryFrequency,
	today: Date,
): string {
	return getUpcomingDeductionDate(frequency, today).toISOString().slice(0, 10)
}

export function getValidFirstDiscountDates(
	frequency: SalaryFrequency,
	today: Date,
	count: number,
): Date[] {
	const dates: Date[] = []
	let year = today.getUTCFullYear()
	let month = today.getUTCMonth()
	const day = today.getUTCDate()

	if (frequency === 'monthly') {
		let cursor = lastDayOfMonthUTC(year, month)
		if (!isSameOrAfter(cursor, today)) {
			month += 1
			cursor = lastDayOfMonthUTC(year + Math.floor(month / 12), month % 12)
		}
		while (dates.length < count) {
			const endOfMonth = lastDayOfMonthUTC(year, month)
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
	let nextIs15th = day <= 15

	while (dates.length < count) {
		const candidate = nextIs15th
			? utcDate(year, month, 15)
			: lastDayOfMonthUTC(year, month)

		if (isSameOrAfter(candidate, today)) {
			dates.push(candidate)
		}

		if (!nextIs15th) {
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

	const year = date.getUTCFullYear()
	const month = date.getUTCMonth()
	const day = date.getUTCDate()
	const endOfMonth = lastDayOfMonthUTC(year, month)
	const isEndOfMonth = day === endOfMonth.getUTCDate()

	if (frequency === 'monthly') {
		return isEndOfMonth
	}

	// bi-monthly: 15th or end of month
	return day === 15 || isEndOfMonth
}

/** Past/future: only calendar shape (month-end vs 15|EOM), no `date >= today` check. */
export function isFirstDiscountAnchorCalendarShapeValid(
	frequency: SalaryFrequency,
	date: Date,
): boolean {
	const year = date.getUTCFullYear()
	const month = date.getUTCMonth()
	const day = date.getUTCDate()
	const endOfMonth = lastDayOfMonthUTC(year, month)
	const isEndOfMonth = day === endOfMonth.getUTCDate()
	if (frequency === 'monthly') {
		return isEndOfMonth
	}
	return day === 15 || isEndOfMonth
}
