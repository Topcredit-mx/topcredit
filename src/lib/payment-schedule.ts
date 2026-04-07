import { Decimal } from './decimal'
import { financedCreditAmount } from './pre-authorization-capacity'

export type PaymentScheduleEntry = { dueDate: Date; amount: string }

function utcDate(year: number, month: number, day: number): Date {
	return new Date(Date.UTC(year, month, day))
}

function lastDayOfMonthUTC(year: number, month: number): Date {
	return new Date(Date.UTC(year, month + 1, 0))
}

function nextBiMonthlyDate(current: Date): Date {
	const year = current.getUTCFullYear()
	const month = current.getUTCMonth()
	const day = current.getUTCDate()

	if (day === 15) {
		return lastDayOfMonthUTC(year, month)
	}
	// current is month-end, next is 15th of next month
	return utcDate(year, month + 1, 15)
}

function nextMonthEnd(current: Date): Date {
	const year = current.getUTCFullYear()
	const month = current.getUTCMonth() + 1
	return lastDayOfMonthUTC(year, month)
}

function normalizeToUTCMidnight(date: Date): Date {
	return utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

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

	const start = normalizeToUTCMidnight(firstDiscountDate)
	const dates: Date[] = [start]
	for (let i = 1; i < totalPayments; i++) {
		const prev = dates[i - 1]
		if (!prev) break
		dates.push(
			frequency === 'monthly' ? nextMonthEnd(prev) : nextBiMonthlyDate(prev),
		)
	}

	const schedule: Array<PaymentScheduleEntry> = []
	for (let i = 0; i < totalPayments; i++) {
		const dueDate = dates[i]
		if (!dueDate) break

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
