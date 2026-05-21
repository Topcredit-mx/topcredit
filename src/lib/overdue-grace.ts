import {
	startOfDayInstantMexicoCity,
	subtractCalendarDays,
	todayYmdMexicoCity,
} from '~/lib/calendar-date-tz'

export const OVERDUE_GRACE_PERIOD_DAYS = 15

/**
 * Start of the Mexico calendar day that is {@link OVERDUE_GRACE_PERIOD_DAYS}
 * before `todayYmd`. Listings use `due_date < this` as **overdue**
 * (aligned with `subtractCalendarDays` on `todayYmd`).
 */
export function overdueGraceCutoff(todayYmd: string): Date {
	const cutYmd = subtractCalendarDays(todayYmd, OVERDUE_GRACE_PERIOD_DAYS)
	return startOfDayInstantMexicoCity(cutYmd)
}

/** Grace cutoff for the Mexico calendar day that contains `now` (e.g. request clock). */
export function overdueGraceCutoffForNow(now: Date): Date {
	return overdueGraceCutoff(todayYmdMexicoCity(now))
}
