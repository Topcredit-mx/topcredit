import {
	calendarYmdInMexicoCity,
	endOfDayInstantMexicoCity,
} from '~/lib/calendar-date-tz'
import { Decimal } from './decimal'
import { financedCreditAmount } from './pre-authorization-capacity'

export type PaymentScheduleEntry = {
	dueDate: Date
	amount: string
	principalAmount: string
	financingAmount: string
}

function allocateFinancingFrontLoaded(
	amounts: ReadonlyArray<Decimal>,
	financingTotal: Decimal,
): Array<Decimal> {
	const n = amounts.length
	const out: Array<Decimal> = []
	let remaining = financingTotal
	const weightSum = new Decimal(n).mul(n + 1).div(2)

	for (let i = 0; i < n; i++) {
		const amountI = amounts[i]
		if (amountI === undefined) throw new Error('missing payment amount')

		if (i === n - 1) {
			out.push(remaining)
			break
		}

		let futureCap = new Decimal(0)
		for (let j = i + 1; j < n; j++) {
			const a = amounts[j]
			if (a === undefined) throw new Error('missing payment amount')
			futureCap = futureCap.plus(a)
		}

		const rawMin = remaining.minus(futureCap)
		const fiMin = rawMin.lt(0) ? new Decimal(0) : rawMin
		const fiMax = amountI.lt(remaining) ? amountI : remaining
		const wi = n - i
		const target = financingTotal
			.mul(wi)
			.div(weightSum)
			.todp(2, Decimal.ROUND_DOWN)

		let fi = target
		if (fi.lt(fiMin)) {
			fi = fiMin
		}
		if (fi.gt(fiMax)) {
			fi = fiMax
		}

		out.push(fi)
		remaining = remaining.minus(fi)
	}

	return out
}

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
 * `dueDate` is **23:59:59.999** on the calendar day in `America/Mexico_City`.
 * Steps YMDs with {@link calendarYmdInMexicoCity} / chain.
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

	const totalFinanced = new Decimal(financedCreditAmount(loanPrincipal, rate))
	const principalDec = new Decimal(loanPrincipal)
	const financingTotal = totalFinanced.minus(principalDec)

	const perPrincipal = principalDec
		.div(totalPayments)
		.todp(2, Decimal.ROUND_DOWN)
	const perFinancing = financingTotal
		.div(totalPayments)
		.todp(2, Decimal.ROUND_DOWN)
	const perPaymentCombined = perPrincipal.plus(perFinancing)

	const principalPaidBeforeLast = perPrincipal.mul(totalPayments - 1)
	const financingPaidBeforeLast = perFinancing.mul(totalPayments - 1)
	const lastPrincipal = principalDec.minus(principalPaidBeforeLast)
	const lastFinancing = financingTotal.minus(financingPaidBeforeLast)
	const lastAmount = lastPrincipal.plus(lastFinancing)

	const rowAmounts: Array<Decimal> = []
	for (let i = 0; i < totalPayments; i++) {
		rowAmounts.push(i < totalPayments - 1 ? perPaymentCombined : lastAmount)
	}
	const financingAllocated = allocateFinancingFrontLoaded(
		rowAmounts,
		financingTotal,
	)

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

		const amt = rowAmounts[i]
		const fin = financingAllocated[i]
		if (amt === undefined || fin === undefined) {
			throw new Error('missing computed payment row')
		}
		const pr = amt.minus(fin)
		schedule.push({
			dueDate,
			amount: amt.toFixed(2),
			principalAmount: pr.toFixed(2),
			financingAmount: fin.toFixed(2),
		})
	}

	return schedule
}
