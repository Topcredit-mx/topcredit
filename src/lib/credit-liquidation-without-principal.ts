import { Decimal } from '~/lib/decimal'
import { financedCreditAmount } from '~/lib/pre-authorization-capacity'

export type PaymentAmountRow = { amount: string }

/**
 * Sum of non-principal portions for installments still open on the installment side,
 * allocating principal equally across every scheduled payment (`totalScheduledPayments`).
 */
export function sumLiquidationWithoutPrincipal(params: {
	loanPrincipal: number
	rate: number
	totalScheduledPayments: number
	pendingPayments: ReadonlyArray<PaymentAmountRow>
}): string {
	const { loanPrincipal, rate, totalScheduledPayments, pendingPayments } =
		params
	if (pendingPayments.length === 0 || totalScheduledPayments <= 0) {
		return '0.00'
	}
	const totalFinanced = new Decimal(financedCreditAmount(loanPrincipal, rate))
	const principalEach = new Decimal(loanPrincipal).div(totalScheduledPayments)
	let sum = new Decimal(0)
	for (const p of pendingPayments) {
		const installment = new Decimal(p.amount)
		const nonPrincipal = installment.minus(principalEach)
		sum = sum.plus(nonPrincipal.gt(0) ? nonPrincipal : new Decimal(0))
	}
	const maxFinanceCharge = totalFinanced.minus(loanPrincipal)
	const capped = sum.gt(maxFinanceCharge) ? maxFinanceCharge : sum
	return capped.todp(2, Decimal.ROUND_HALF_UP).toFixed(2)
}
