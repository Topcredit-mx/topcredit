import { getUpcomingDeductionDate } from '~/lib/first-discount-date'

export type CreditPaymentTimestamps = {
	hrConfirmedAt: Date | null
	installmentConfirmedAt: Date | null
}

export function canHrConfirm(
	p: Pick<CreditPaymentTimestamps, 'hrConfirmedAt'>,
): boolean {
	return p.hrConfirmedAt === null
}

export function canConfirmInstallment(p: CreditPaymentTimestamps): boolean {
	return p.hrConfirmedAt !== null && p.installmentConfirmedAt === null
}

export function isWithinUpcomingDeductionPeriodForInstallment(
	dueDate: Date,
	upcomingDeductionDate: Date,
): boolean {
	return (
		dueDate.toISOString().slice(0, 10) <=
		upcomingDeductionDate.toISOString().slice(0, 10)
	)
}

export type InstallmentEligibilityInput = CreditPaymentTimestamps & {
	dueDate: Date
	employeeSalaryFrequency: 'monthly' | 'bi-monthly'
}

export function canConfirmInstallmentForCreditDetailRow(
	p: InstallmentEligibilityInput,
	today: Date,
): boolean {
	if (!canConfirmInstallment(p)) return false
	const upcoming = getUpcomingDeductionDate(p.employeeSalaryFrequency, today)
	return isWithinUpcomingDeductionPeriodForInstallment(p.dueDate, upcoming)
}

export type InstallmentQueueTimestamps = {
	hrConfirmedAt: string | null
	installmentConfirmedAt: string | null
}

function parseIsoDateString(value: string | null): Date | null {
	if (value === null) return null
	const d = new Date(value)
	return Number.isNaN(d.getTime()) ? null : d
}

export function canConfirmInstallmentInQueue(
	row: InstallmentQueueTimestamps,
): boolean {
	return canConfirmInstallment({
		hrConfirmedAt: parseIsoDateString(row.hrConfirmedAt),
		installmentConfirmedAt: parseIsoDateString(row.installmentConfirmedAt),
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

function queueRowFullyConfirmed(row: InstallmentQueueTimestamps): boolean {
	return (
		parseIsoDateString(row.hrConfirmedAt) !== null &&
		parseIsoDateString(row.installmentConfirmedAt) !== null
	)
}

export type InstallmentOverdueQueueRow = InstallmentQueueTimestamps & {
	dueDate: string
}

export function isInstallmentOverdueInQueue(
	row: InstallmentOverdueQueueRow,
	today: Date,
): boolean {
	if (queueRowFullyConfirmed(row)) return false
	return isDueDateBeforeToday(row.dueDate, today)
}

export function isInstallmentOverdueFromDb(
	p: CreditPaymentTimestamps & { dueDate: Date },
	today: Date,
): boolean {
	if (p.hrConfirmedAt !== null && p.installmentConfirmedAt !== null)
		return false
	return isDueDateBeforeToday(p.dueDate.toISOString(), today)
}

export function isFullyConfirmed(p: CreditPaymentTimestamps): boolean {
	return p.hrConfirmedAt !== null && p.installmentConfirmedAt !== null
}

export function allInstallmentsFullyConfirmed(
	installments: ReadonlyArray<CreditPaymentTimestamps>,
): boolean {
	return installments.every(isFullyConfirmed)
}

export type CsvInstallmentRow = {
	payrollNumber: string
	amount: string
	dueDate: string
}

export type CsvInstallmentParseResult = {
	rows: CsvInstallmentRow[]
	errors: Array<{ line: number; message: string }>
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const POSITIVE_NUMBER_REGEX = /^\d+(\.\d+)?$/

export function parseCsvInstallmentConfirmations(
	csvContent: string,
): CsvInstallmentParseResult {
	const rows: CsvInstallmentRow[] = []
	const errors: Array<{ line: number; message: string }> = []

	const lines = csvContent
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.length > 0)

	if (lines.length <= 1) return { rows, errors }

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
