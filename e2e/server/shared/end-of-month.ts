import { endOfCurrentMonthEodMx } from './mexico-seed-dates'

/** @deprecated Use {@link endOfCurrentMonthEodMx} (Mexico EOD). */
export function endOfCurrentMonthUTC(now: Date): Date {
	return endOfCurrentMonthEodMx(now)
}
