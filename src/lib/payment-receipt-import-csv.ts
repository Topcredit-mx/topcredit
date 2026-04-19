export type PaymentReceiptImportCsvErrorRow = {
	line: number
	payrollNumber: string | null
	amount: string | null
	dueDate: string | null
	message: string
}

export type PaymentReceiptImportParsedRow = {
	payrollNumber: string
	amount: string
	dueDate: string
	line: number
}

export type PaymentReceiptImportCandidate = {
	paymentId: number
	companyId: number
	hrConfirmedAt: Date | null
	paymentsConfirmedAt: Date | null
}

export function makePaymentReceiptImportKey(
	payrollNumber: string,
	amount: string,
	dueDate: string,
): string {
	return `${payrollNumber}|${amount}|${dueDate}`
}

export function classifyPaymentReceiptCsvImportRows(
	validRows: PaymentReceiptImportParsedRow[],
	candidateByKey: Map<string, PaymentReceiptImportCandidate>,
	canConfirmPaymentReceipt: (c: PaymentReceiptImportCandidate) => boolean,
): {
	matchedPaymentIds: number[]
	matchedRows: Array<{ payrollNumber: string; amount: string; dueDate: string }>
	errors: PaymentReceiptImportCsvErrorRow[]
	warnings: PaymentReceiptImportCsvErrorRow[]
} {
	const errorRows: PaymentReceiptImportCsvErrorRow[] = []
	const matchedPaymentIds: number[] = []
	const matchedRows: Array<{
		payrollNumber: string
		amount: string
		dueDate: string
	}> = []
	const warningRows: PaymentReceiptImportCsvErrorRow[] = []

	for (const csvRow of validRows) {
		const key = makePaymentReceiptImportKey(
			csvRow.payrollNumber,
			csvRow.amount,
			csvRow.dueDate,
		)
		const candidate = candidateByKey.get(key)

		if (candidate == null || !canConfirmPaymentReceipt(candidate)) {
			errorRows.push({
				line: csvRow.line,
				payrollNumber: csvRow.payrollNumber,
				amount: csvRow.amount,
				dueDate: csvRow.dueDate,
				message: 'no-match',
			})
		} else if (candidate.paymentsConfirmedAt != null) {
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
