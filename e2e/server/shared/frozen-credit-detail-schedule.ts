import { generatePaymentSchedule } from '~/lib/payment-schedule'
import { eodYmd } from './mexico-seed-dates'

/** Playwright clock for credit-detail state E2E (Dec 31 overdue, Jan 31 upcoming). */
export const FROZEN_CREDIT_DETAIL_E2E_CLOCK_ISO = '2023-01-16T12:00:00.000Z'

const FROZEN_SCHEDULE_START_YMD = '2022-11-30'

export function frozenCreditDetailMonthlySchedule(params: {
	loanPrincipal: number
	rate: number
	totalPayments: number
}) {
	return generatePaymentSchedule({
		loanPrincipal: params.loanPrincipal,
		rate: params.rate,
		totalPayments: params.totalPayments,
		frequency: 'monthly',
		firstDiscountDate: eodYmd(FROZEN_SCHEDULE_START_YMD),
	})
}
