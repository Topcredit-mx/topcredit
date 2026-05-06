import {
	startOfDayInstantMexicoCity,
	todayYmdMexicoCity,
} from '~/lib/calendar-date-tz'

export const CREDIT_ADMIN_DEFAULT_MIN_OVERDUE_DAYS = 14

export type CreditPaymentDueLike = {
	dueDate: Date
	hrConfirmedAt: Date | null
	installmentConfirmedAt: Date | null
	closedByLiquidationAt?: Date | null
}

export function creditHasLongOverdueForAdminDefault(
	payments: readonly CreditPaymentDueLike[],
	asOf: Date,
): boolean {
	if (payments.length === 0) {
		return false
	}
	const todayYmdMx = todayYmdMexicoCity(asOf)
	const startOfTodayMx = startOfDayInstantMexicoCity(todayYmdMx)
	const minDueThreshold = new Date(
		startOfTodayMx.getTime() -
			CREDIT_ADMIN_DEFAULT_MIN_OVERDUE_DAYS * 86_400_000,
	)
	for (const p of payments) {
		if (p.dueDate >= minDueThreshold) {
			continue
		}
		if (p.closedByLiquidationAt != null) {
			continue
		}
		if (p.hrConfirmedAt === null || p.installmentConfirmedAt === null) {
			return true
		}
	}
	return false
}
