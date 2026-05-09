import { Decimal } from '~/lib/decimal'

export function liquidationOutstandingFromPaymentRows(
	payments: ReadonlyArray<{
		amount: string
		principalAmount: string
		financingAmount: string
		installmentConfirmedAt: Date | null
		closedByLiquidationAt?: Date | null
	}>,
): {
	outstandingPrincipal: string
	outstandingFinancing: string
	outstandingScheduledTotal: string
	pendingInstallmentCount: number
	confirmedInstallmentCount: number
} {
	let principalSum = new Decimal(0)
	let financingSum = new Decimal(0)
	let totalSum = new Decimal(0)
	let pendingInstallmentCount = 0
	let confirmedInstallmentCount = 0
	for (const row of payments) {
		const resolvedLikeConfirmed =
			row.installmentConfirmedAt != null || row.closedByLiquidationAt != null
		if (resolvedLikeConfirmed) {
			confirmedInstallmentCount++
			continue
		}
		principalSum = principalSum.plus(row.principalAmount)
		financingSum = financingSum.plus(row.financingAmount)
		totalSum = totalSum.plus(row.amount)
		pendingInstallmentCount++
	}
	return {
		outstandingPrincipal: principalSum.toFixed(2),
		outstandingFinancing: financingSum.toFixed(2),
		outstandingScheduledTotal: totalSum.toFixed(2),
		pendingInstallmentCount,
		confirmedInstallmentCount,
	}
}
