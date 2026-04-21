export type InstallmentImportCsvErrorRow = {
	line: number
	payrollNumber: string | null
	amount: string | null
	dueDate: string | null
	message: string
}

export type InstallmentImportParsedRow = {
	payrollNumber: string
	amount: string
	dueDate: string
	line: number
}

export type InstallmentImportCandidate = {
	paymentId: number
	companyId: number
	hrConfirmedAt: Date | null
	installmentConfirmedAt: Date | null
}

export function makeInstallmentImportKey(
	payrollNumber: string,
	amount: string,
	dueDate: string,
): string {
	return `${payrollNumber}|${amount}|${dueDate}`
}

export function classifyInstallmentCsvImportRows(
	validRows: InstallmentImportParsedRow[],
	candidateByKey: Map<string, InstallmentImportCandidate>,
	canConfirmInstallmentRow: (c: InstallmentImportCandidate) => boolean,
): {
	matchedPaymentIds: number[]
	matchedRows: Array<{ payrollNumber: string; amount: string; dueDate: string }>
	errors: InstallmentImportCsvErrorRow[]
	warnings: InstallmentImportCsvErrorRow[]
} {
	const errorRows: InstallmentImportCsvErrorRow[] = []
	const matchedPaymentIds: number[] = []
	const matchedRows: Array<{
		payrollNumber: string
		amount: string
		dueDate: string
	}> = []
	const warningRows: InstallmentImportCsvErrorRow[] = []

	for (const csvRow of validRows) {
		const key = makeInstallmentImportKey(
			csvRow.payrollNumber,
			csvRow.amount,
			csvRow.dueDate,
		)
		const candidate = candidateByKey.get(key)

		if (candidate == null || !canConfirmInstallmentRow(candidate)) {
			errorRows.push({
				line: csvRow.line,
				payrollNumber: csvRow.payrollNumber,
				amount: csvRow.amount,
				dueDate: csvRow.dueDate,
				message: 'no-match',
			})
		} else if (candidate.installmentConfirmedAt != null) {
			warningRows.push({
				line: csvRow.line,
				payrollNumber: csvRow.payrollNumber,
				amount: csvRow.amount,
				dueDate: csvRow.dueDate,
				message: 'already-received',
			})
		} else if (candidate.hrConfirmedAt == null) {
			warningRows.push({
				line: csvRow.line,
				payrollNumber: csvRow.payrollNumber,
				amount: csvRow.amount,
				dueDate: csvRow.dueDate,
				message: 'not-hr-confirmed',
			})
		} else {
			matchedPaymentIds.push(candidate.paymentId)
			matchedRows.push({
				payrollNumber: csvRow.payrollNumber,
				amount: csvRow.amount,
				dueDate: csvRow.dueDate,
			})
		}
	}

	return {
		matchedPaymentIds,
		matchedRows,
		errors: errorRows,
		warnings: warningRows,
	}
}
