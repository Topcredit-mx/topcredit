import {
	calendarYmdInMexicoCity,
	endOfDayInstantMexicoCity,
} from '~/lib/calendar-date-tz'
import { Decimal } from './decimal'
import { financedCreditAmount } from './pre-authorization-capacity'

export type PaymentScheduleEntry = { dueDate: Date; amount: string }

function lastDayOfMonthYmd(year: number, month0: number): string {
	const last = new Date(Date.UTC(year, month0 + 1, 0))
	const d = last.getUTCDate()
	return `${String(year).padStart(4, '0')}-${String(month0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function ymdString(year: number, month0: number, day: number): string {
	return `${String(year).padStart(4, '0')}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function nextBiMonthlyYmd(ymd: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
	if (m == null) return ymd
	const year = Number(m[1])
	const month0 = Number(m[2]) - 1
	const day = Number(m[3])
	if (day === 15) {
		return lastDayOfMonthYmd(year, month0)
	}
	// current is month-end, next is 15th of next month
	if (month0 === 11) {
		return ymdString(year + 1, 0, 15)
	}
	return ymdString(year, month0 + 1, 15)
}

function nextMonthEndYmd(ymd: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
	if (m == null) return ymd
	const year = Number(m[1])
	const month0 = Number(m[2]) - 1
	if (month0 === 11) {
		return lastDayOfMonthYmd(year + 1, 0)
	}
	return lastDayOfMonthYmd(year, month0 + 1)
}

/**
 * `dueDate` is **23:59:59.999** on the business calendar day in
 * `America/Mexico_City`. Steps YMDs with {@link calendarYmdInMexicoCity} / chain.
 */
export function generatePaymentSchedule(params: {
	loanPrincipal: number
	rate: number
	totalPayments: number
	frequency: 'monthly' | 'bi-monthly'
	firstDiscountDate: Date
}): Array<PaymentScheduleEntry> {
	const { loanPrincipal, rate, totalPayments, frequency, firstDiscountDate } =
		params

	const total = new Decimal(financedCreditAmount(loanPrincipal, rate))
	const perPayment = total.div(totalPayments).todp(2, Decimal.ROUND_DOWN)

	const startYmd = calendarYmdInMexicoCity(firstDiscountDate)
	const dates: string[] = [startYmd]
	for (let i = 1; i < totalPayments; i++) {
		const prevYmd = dates[i - 1]
		if (prevYmd === undefined) break
		dates.push(
			frequency === 'monthly'
				? nextMonthEndYmd(prevYmd)
				: nextBiMonthlyYmd(prevYmd),
		)
	}

	const schedule: Array<PaymentScheduleEntry> = []
	for (let i = 0; i < totalPayments; i++) {
		const ymd = dates[i]
		if (ymd === undefined) break
		const dueDate = endOfDayInstantMexicoCity(ymd)

		if (i < totalPayments - 1) {
			schedule.push({ dueDate, amount: perPayment.toFixed(2) })
		} else {
			const paid = perPayment.mul(totalPayments - 1)
			const lastAmount = total.minus(paid)
			schedule.push({ dueDate, amount: lastAmount.toFixed(2) })
		}
	}

	return schedule
}
