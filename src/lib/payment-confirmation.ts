export type PaymentTimestamps = {
	hrConfirmedAt: Date | null
	paymentsConfirmedAt: Date | null
}

export function canHrConfirm(
	p: Pick<PaymentTimestamps, 'hrConfirmedAt'>,
): boolean {
	return p.hrConfirmedAt === null
}

export function canConfirmReceipt(p: PaymentTimestamps): boolean {
	return p.hrConfirmedAt !== null && p.paymentsConfirmedAt === null
}

export type QueueInstallmentReceiptTimestamps = {
	hrConfirmedAt: string | null
	paymentsConfirmedAt: string | null
}

function parseIsoDateString(value: string | null): Date | null {
	if (value === null) return null
	const d = new Date(value)
	return Number.isNaN(d.getTime()) ? null : d
}

/** Queue row (ISO string timestamps) eligible for Payments “confirm receipt”, same as the table checkbox. */
export function canConfirmReceiptQueueInstallment(
	row: QueueInstallmentReceiptTimestamps,
): boolean {
	return canConfirmReceipt({
		hrConfirmedAt: parseIsoDateString(row.hrConfirmedAt),
		paymentsConfirmedAt: parseIsoDateString(row.paymentsConfirmedAt),
	})
}

export function isFullyConfirmed(p: PaymentTimestamps): boolean {
	return p.hrConfirmedAt !== null && p.paymentsConfirmedAt !== null
}

export function allPaymentsFullyConfirmed(
	payments: ReadonlyArray<PaymentTimestamps>,
): boolean {
	return payments.every(isFullyConfirmed)
}

export function canReversePaymentsReceiptConfirmation(
	p: PaymentTimestamps,
): boolean {
	return p.hrConfirmedAt !== null && p.paymentsConfirmedAt !== null
}

export type CsvPaymentRow = {
	payrollNumber: string
	amount: string
	dueDate: string
}

export type CsvParseResult = {
	rows: CsvPaymentRow[]
	errors: Array<{ line: number; message: string }>
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const POSITIVE_NUMBER_REGEX = /^\d+(\.\d+)?$/

export function parseCsvPaymentConfirmations(
	csvContent: string,
): CsvParseResult {
	const rows: CsvPaymentRow[] = []
	const errors: Array<{ line: number; message: string }> = []

	const lines = csvContent
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.length > 0)

	// Nothing or just a header
	if (lines.length <= 1) return { rows, errors }

	// Skip header (line index 0), data starts at index 1 (line number 2)
	for (let i = 1; i < lines.length; i++) {
		const lineNumber = i + 1
		const line = lines[i]
		if (!line) continue

		const parts = line.split(',')
		if (parts.length < 3) {
			errors.push({
				line: lineNumber,
				message: 'Row must have 3 columns: payroll_number, amount, date',
			})
			continue
		}

		const payrollNumber = (parts[0] ?? '').trim()
		const amount = (parts[1] ?? '').trim()
		const dueDate = (parts[2] ?? '').trim()

		if (!payrollNumber) {
			errors.push({ line: lineNumber, message: 'payroll_number is required' })
			continue
		}

		if (!POSITIVE_NUMBER_REGEX.test(amount)) {
			errors.push({ line: lineNumber, message: `Invalid amount: "${amount}"` })
			continue
		}

		if (!ISO_DATE_REGEX.test(dueDate)) {
			errors.push({
				line: lineNumber,
				message: `Invalid date format: "${dueDate}" (expected YYYY-MM-DD)`,
			})
			continue
		}

		rows.push({ payrollNumber, amount, dueDate })
	}

	return { rows, errors }
}
