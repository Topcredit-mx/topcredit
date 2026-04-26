import { endOfDayInstantMexicoCity } from '../src/lib/calendar-date-tz'
import { getValidFirstDiscountDates } from '../src/lib/first-discount-date'
import type {
	FirstDiscountHistoricAnchor,
	FirstDiscountPreference,
} from './seed.fixtures'

const NEXT_VALID_LIST_MAX = 36

export type SeedFirstDiscountResolveOptions = {
	monthsAgo?: number
	nextValidPickIndex?: number
	historicAnchor?: FirstDiscountHistoricAnchor
}

function endOfMonthMonthsAgo(today: Date, monthsBack: number): Date {
	const d = new Date(
		Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsBack, 1),
	)
	const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
	const ymd = last.toISOString().slice(0, 10)
	return endOfDayInstantMexicoCity(ymd)
}

function fifteenthOfMonthMonthsAgo(today: Date, monthsBack: number): Date {
	const d = new Date(
		Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsBack, 15),
	)
	return endOfDayInstantMexicoCity(d.toISOString().slice(0, 10))
}

export function resolveSeedFirstDiscountDate(
	preference: FirstDiscountPreference,
	salaryFrequency: 'monthly' | 'bi-monthly',
	today: Date,
	options?: SeedFirstDiscountResolveOptions,
): Date | null {
	switch (preference) {
		case 'none':
			return null
		case 'next-valid': {
			const dates = getValidFirstDiscountDates(
				salaryFrequency,
				today,
				NEXT_VALID_LIST_MAX,
			)
			if (dates.length === 0) {
				return null
			}
			const pick = options?.nextValidPickIndex ?? 0
			const idx = ((pick % dates.length) + dates.length) % dates.length
			const chosen = dates[idx]
			return chosen ?? null
		}
		case 'overdue-credit':
			// Bulk seeds use historic-offset + historicAnchor instead for varied anchors.
			return endOfMonthMonthsAgo(today, 5)
		case 'settled-six':
			return endOfMonthMonthsAgo(today, 7)
		case 'historic-offset': {
			const months = options?.monthsAgo ?? 12
			if (salaryFrequency === 'monthly') {
				return endOfMonthMonthsAgo(today, months)
			}
			const anchor = options?.historicAnchor ?? 'month-end'
			if (anchor === 'fifteenth') {
				return fifteenthOfMonthMonthsAgo(today, months)
			}
			return endOfMonthMonthsAgo(today, months)
		}
	}
}
