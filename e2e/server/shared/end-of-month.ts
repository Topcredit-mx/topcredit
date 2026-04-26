import { endOfCurrentMonthEodMx } from './mexico-seed-dates'

/** @deprecated Use {@link endOfCurrentMonthEodMx} (Mexico business EOD). */
export function endOfCurrentMonthUTC(now: Date): Date {
	return endOfCurrentMonthEodMx(now)
}
