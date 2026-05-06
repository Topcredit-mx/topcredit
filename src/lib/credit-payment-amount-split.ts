import { Decimal } from '~/lib/decimal'
import { financedCreditAmount } from '~/lib/pre-authorization-capacity'

export function approximatePrincipalFinancingForPaymentAmount(params: {
	paymentAmount: string
	loanPrincipal: number
	annualRate: number
}): { principalAmount: string; financingAmount: string } {
	const financed = new Decimal(
		financedCreditAmount(params.loanPrincipal, params.annualRate),
	)
	const principalTotal = new Decimal(params.loanPrincipal)
	const amt = new Decimal(params.paymentAmount)
	const principalPortion = amt
		.mul(principalTotal)
		.div(financed)
		.todp(2, Decimal.ROUND_DOWN)
	const financingPortion = amt.minus(principalPortion)
	return {
		principalAmount: principalPortion.toFixed(2),
		financingAmount: financingPortion.toFixed(2),
	}
}
