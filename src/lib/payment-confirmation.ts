import { getUpcomingDeductionDate } from '~/lib/first-discount-date'

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

export function isWithinUpcomingDeductionPeriodForReceipt(
	dueDate: Date,
	upcomingDeductionDate: Date,
): boolean {
	return (
		dueDate.toISOString().slice(0, 10) <=
		upcomingDeductionDate.toISOString().slice(0, 10)
	)
}

export type ReceiptEligibilityInput = PaymentTimestamps & {
	dueDate: Date
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
}

export function canConfirmReceiptForCreditDetailRow(
	p: ReceiptEligibilityInput,
	today: Date,
): boolean {
	if (!canConfirmReceipt(p)) return false
	const upcoming = getUpcomingDeductionDate(p.employeeSalaryFrequency, today)
	return isWithinUpcomingDeductionPeriodForReceipt(p.dueDate, upcoming)
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

function utcDateOnlyString(d: Date): string {
	return d.toISOString().slice(0, 10)
}

function parseDueDateDay(value: string): string | null {
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) return null
	return utcDateOnlyString(parsed)
}

export function isDueDateBeforeToday(
	dueDateIsoOrDay: string,
	today: Date,
): boolean {
	const dueDay = parseDueDateDay(dueDateIsoOrDay)
	if (dueDay === null) return false
	return dueDay < utcDateOnlyString(today)
}

function queueRowFullyConfirmed(
	row: QueueInstallmentReceiptTimestamps,
): boolean {
	return (
		parseIsoDateString(row.hrConfirmedAt) !== null &&
		parseIsoDateString(row.paymentsConfirmedAt) !== null
	)
}

export type PaymentsOverdueQueueRow = QueueInstallmentReceiptTimestamps & {
	dueDate: string
}

export function isPaymentsOverdueQueueInstallment(
	row: PaymentsOverdueQueueRow,
	today: Date,
): boolean {
	if (queueRowFullyConfirmed(row)) return false
	return isDueDateBeforeToday(row.dueDate, today)
}

export function isPaymentsOverdueFromDb(
	p: PaymentTimestamps & { dueDate: Date },
	today: Date,
): boolean {
	if (p.hrConfirmedAt !== null && p.paymentsConfirmedAt !== null) return false
	return isDueDateBeforeToday(p.dueDate.toISOString(), today)
}

export function isFullyConfirmed(p: PaymentTimestamps): boolean {
	return p.hrConfirmedAt !== null && p.paymentsConfirmedAt !== null
}

export function allPaymentsFullyConfirmed(
	payments: ReadonlyArray<PaymentTimestamps>,
): boolean {
	return payments.every(isFullyConfirmed)
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
