import type { InstallmentForQueue } from '~/server/queries'

const HEADERS = 'empleado,numero_nomina,empresa,monto,fecha_vencimiento'

function csvField(value: string): string {
	if (value.includes('"') || value.includes(',') || value.includes('\n')) {
		return `"${value.replace(/"/g, '""')}"`
	}
	return value
}

export function formatDeductionsCsv(
	installments: InstallmentForQueue[],
): string {
	if (installments.length === 0) return HEADERS

	const rows = installments.map((row) =>
		[
			csvField(row.employeeName),
			csvField(row.payrollNumber ?? ''),
			csvField(row.companyName),
			csvField(row.amount),
			csvField(row.dueDate.slice(0, 10)),
		].join(','),
	)

	return [HEADERS, ...rows].join('\n')
}
