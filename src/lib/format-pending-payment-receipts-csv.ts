import type { InstallmentForQueue } from '~/server/queries'

const HEADERS =
	'empleado,numero_nomina,empresa,monto,fecha_de_pago,proxima_deduccion,deduccion_rh,recepcion'

/** Matches `payments-status-*` in UI (Spanish). */
function hrDeductionLabel(hrConfirmedAt: string | null): string {
	return hrConfirmedAt === null ? 'Pendiente' : 'Confirmado'
}

/** Matches receipt column labels in payments queue (Spanish). */
function receiptLabel(
	hrConfirmedAt: string | null,
	paymentsConfirmedAt: string | null,
): string {
	if (paymentsConfirmedAt !== null) return 'Confirmado'
	if (hrConfirmedAt !== null) return 'Pendiente'
	return 'En espera de RH'
}

function dateYmd(iso: string): string {
	return iso.slice(0, 10)
}

function csvField(value: string): string {
	if (value.includes('"') || value.includes(',') || value.includes('\n')) {
		return `"${value.replace(/"/g, '""')}"`
	}
	return value
}

export function formatPendingPaymentReceiptsCsv(
	installments: InstallmentForQueue[],
): string {
	if (installments.length === 0) return HEADERS

	const rows = installments.map((row) =>
		[
			csvField(row.employeeName),
			csvField(row.payrollNumber ?? ''),
			csvField(row.companyName),
			csvField(row.amount),
			csvField(dateYmd(row.dueDate)),
			csvField(dateYmd(row.nextDeductionDate)),
			csvField(hrDeductionLabel(row.hrConfirmedAt)),
			csvField(receiptLabel(row.hrConfirmedAt, row.paymentsConfirmedAt)),
		].join(','),
	)

	return [HEADERS, ...rows].join('\n')
}
