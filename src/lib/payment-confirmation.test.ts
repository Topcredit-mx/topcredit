import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
	allPaymentsFullyConfirmed,
	canConfirmReceipt,
	canConfirmReceiptForCreditDetailRow,
	canConfirmReceiptQueueInstallment,
	canHrConfirm,
	isFullyConfirmed,
	isCalendarOverduePaymentReceiptFromDb,
	isCalendarOverduePaymentReceiptInstallment,
	parseCsvPaymentConfirmations,
} from './payment-confirmation'

const NOW = new Date('2026-01-31T10:00:00Z')

describe('canHrConfirm', () => {
	test('returns true when hrConfirmedAt is null', () => {
		assert.equal(canHrConfirm({ hrConfirmedAt: null }), true)
	})

	test('returns false when hrConfirmedAt is set', () => {
		assert.equal(canHrConfirm({ hrConfirmedAt: NOW }), false)
	})
})

describe('canConfirmReceiptForCreditDetailRow', () => {
	const today = new Date('2023-01-05T12:00:00.000Z')

	test('allows delayed installment with HR confirmed and receipt pending within period', () => {
		assert.equal(
			canConfirmReceiptForCreditDetailRow(
				{
					hrConfirmedAt: new Date('2022-12-31T12:00:00.000Z'),
					paymentsConfirmedAt: null,
					dueDate: new Date('2022-12-31T12:00:00.000Z'),
					employeeSalaryFrequency: 'monthly',
				},
				today,
			),
			true,
		)
	})

	test('allows upcoming-period installment when due is on upcoming deduction date', () => {
		assert.equal(
			canConfirmReceiptForCreditDetailRow(
				{
					hrConfirmedAt: new Date('2023-01-31T12:00:00.000Z'),
					paymentsConfirmedAt: null,
					dueDate: new Date('2023-01-31T12:00:00.000Z'),
					employeeSalaryFrequency: 'monthly',
				},
				today,
			),
			true,
		)
	})

	test('blocks future installment after upcoming deduction date', () => {
		assert.equal(
			canConfirmReceiptForCreditDetailRow(
				{
					hrConfirmedAt: new Date('2023-02-28T12:00:00.000Z'),
					paymentsConfirmedAt: null,
					dueDate: new Date('2023-02-28T12:00:00.000Z'),
					employeeSalaryFrequency: 'monthly',
				},
				today,
			),
			false,
		)
	})

	test('returns false when HR has not confirmed', () => {
		assert.equal(
			canConfirmReceiptForCreditDetailRow(
				{
					hrConfirmedAt: null,
					paymentsConfirmedAt: null,
					dueDate: new Date('2022-12-31T12:00:00.000Z'),
					employeeSalaryFrequency: 'monthly',
				},
				today,
			),
			false,
		)
	})
})

describe('canConfirmReceipt', () => {
	test('returns false when hrConfirmedAt is null', () => {
		assert.equal(
			canConfirmReceipt({ hrConfirmedAt: null, paymentsConfirmedAt: null }),
			false,
		)
	})

	test('returns true when hrConfirmedAt is set and paymentsConfirmedAt is null', () => {
		assert.equal(
			canConfirmReceipt({ hrConfirmedAt: NOW, paymentsConfirmedAt: null }),
			true,
		)
	})

	test('returns false when both timestamps are set', () => {
		assert.equal(
			canConfirmReceipt({ hrConfirmedAt: NOW, paymentsConfirmedAt: NOW }),
			false,
		)
	})
})

describe('canConfirmReceiptQueueInstallment', () => {
	test('returns false when hrConfirmedAt is null (ISO strings)', () => {
		assert.equal(
			canConfirmReceiptQueueInstallment({
				hrConfirmedAt: null,
				paymentsConfirmedAt: null,
			}),
			false,
		)
	})

	test('returns true when hr is set and payments receipt is null', () => {
		assert.equal(
			canConfirmReceiptQueueInstallment({
				hrConfirmedAt: '2026-01-15T12:00:00.000Z',
				paymentsConfirmedAt: null,
			}),
			true,
		)
	})

	test('returns false when both are set', () => {
		assert.equal(
			canConfirmReceiptQueueInstallment({
				hrConfirmedAt: '2026-01-15T12:00:00.000Z',
				paymentsConfirmedAt: '2026-01-20T12:00:00.000Z',
			}),
			false,
		)
	})
})

describe('isCalendarOverduePaymentReceiptInstallment', () => {
	const today = new Date('2026-01-20T12:00:00.000Z')

	test('returns false when HR has not confirmed', () => {
		assert.equal(
			isCalendarOverduePaymentReceiptInstallment(
				{
					dueDate: '2025-12-31T12:00:00.000Z',
					hrConfirmedAt: null,
					paymentsConfirmedAt: null,
				},
				today,
			),
			false,
		)
	})

	test('returns false when due date is not before today', () => {
		assert.equal(
			isCalendarOverduePaymentReceiptInstallment(
				{
					dueDate: '2026-01-31T12:00:00.000Z',
					hrConfirmedAt: '2026-01-10T12:00:00.000Z',
					paymentsConfirmedAt: null,
				},
				today,
			),
			false,
		)
	})

	test('returns true when HR confirmed, receipt pending, and due date is before today', () => {
		assert.equal(
			isCalendarOverduePaymentReceiptInstallment(
				{
					dueDate: '2025-12-31T12:00:00.000Z',
					hrConfirmedAt: '2026-01-01T12:00:00.000Z',
					paymentsConfirmedAt: null,
				},
				today,
			),
			true,
		)
	})
})

describe('isCalendarOverduePaymentReceiptFromDb', () => {
	const today = new Date('2026-01-20T12:00:00.000Z')

	test('returns true when timestamps and due date match calendar overdue', () => {
		assert.equal(
			isCalendarOverduePaymentReceiptFromDb(
				{
					hrConfirmedAt: new Date('2026-01-01T12:00:00.000Z'),
					paymentsConfirmedAt: null,
					dueDate: new Date('2025-12-31T12:00:00.000Z'),
				},
				today,
			),
			true,
		)
	})

	test('returns false when due date is today or later', () => {
		assert.equal(
			isCalendarOverduePaymentReceiptFromDb(
				{
					hrConfirmedAt: new Date('2026-01-01T12:00:00.000Z'),
					paymentsConfirmedAt: null,
					dueDate: new Date('2026-01-20T12:00:00.000Z'),
				},
				today,
			),
			false,
		)
	})
})

describe('isFullyConfirmed', () => {
	test('returns false when both timestamps are null', () => {
		assert.equal(
			isFullyConfirmed({ hrConfirmedAt: null, paymentsConfirmedAt: null }),
			false,
		)
	})

	test('returns false when only hrConfirmedAt is set', () => {
		assert.equal(
			isFullyConfirmed({ hrConfirmedAt: NOW, paymentsConfirmedAt: null }),
			false,
		)
	})

	test('returns false when only paymentsConfirmedAt is set', () => {
		assert.equal(
			isFullyConfirmed({ hrConfirmedAt: null, paymentsConfirmedAt: NOW }),
			false,
		)
	})

	test('returns true when both timestamps are set', () => {
		assert.equal(
			isFullyConfirmed({ hrConfirmedAt: NOW, paymentsConfirmedAt: NOW }),
			true,
		)
	})
})

describe('allPaymentsFullyConfirmed', () => {
	test('returns true for empty array', () => {
		assert.equal(allPaymentsFullyConfirmed([]), true)
	})

	test('returns true when all payments have both timestamps set', () => {
		assert.equal(
			allPaymentsFullyConfirmed([
				{ hrConfirmedAt: NOW, paymentsConfirmedAt: NOW },
				{ hrConfirmedAt: NOW, paymentsConfirmedAt: NOW },
			]),
			true,
		)
	})

	test('returns false when any payment has no hrConfirmedAt', () => {
		assert.equal(
			allPaymentsFullyConfirmed([
				{ hrConfirmedAt: NOW, paymentsConfirmedAt: NOW },
				{ hrConfirmedAt: null, paymentsConfirmedAt: null },
			]),
			false,
		)
	})

	test('returns false when any payment has hrConfirmedAt but no paymentsConfirmedAt', () => {
		assert.equal(
			allPaymentsFullyConfirmed([
				{ hrConfirmedAt: NOW, paymentsConfirmedAt: NOW },
				{ hrConfirmedAt: NOW, paymentsConfirmedAt: null },
			]),
			false,
		)
	})

	test('returns false when all payments are pending', () => {
		assert.equal(
			allPaymentsFullyConfirmed([
				{ hrConfirmedAt: null, paymentsConfirmedAt: null },
				{ hrConfirmedAt: null, paymentsConfirmedAt: null },
			]),
			false,
		)
	})
})

describe('parseCsvPaymentConfirmations', () => {
	test('parses valid CSV with multiple rows', () => {
		const csv = [
			'payroll_number,amount,date',
			'EMP-001,1537.50,2026-01-31',
			'EMP-002,2000.00,2026-02-28',
			'EMP-003,500.00,2026-03-31',
		].join('\n')

		const result = parseCsvPaymentConfirmations(csv)

		assert.equal(result.errors.length, 0)
		assert.equal(result.rows.length, 3)
		assert.deepEqual(result.rows[0], {
			payrollNumber: 'EMP-001',
			amount: '1537.50',
			dueDate: '2026-01-31',
		})
		assert.deepEqual(result.rows[1], {
			payrollNumber: 'EMP-002',
			amount: '2000.00',
			dueDate: '2026-02-28',
		})
	})

	test('returns empty rows for CSV with only a header', () => {
		const csv = 'payroll_number,amount,date'
		const result = parseCsvPaymentConfirmations(csv)
		assert.equal(result.rows.length, 0)
		assert.equal(result.errors.length, 0)
	})

	test('returns empty rows for empty string', () => {
		const result = parseCsvPaymentConfirmations('')
		assert.equal(result.rows.length, 0)
		assert.equal(result.errors.length, 0)
	})

	test('trims whitespace from values', () => {
		const csv = [
			'payroll_number,amount,date',
			'  EMP-001 , 1537.50 , 2026-01-31 ',
		].join('\n')

		const result = parseCsvPaymentConfirmations(csv)
		assert.equal(result.errors.length, 0)
		assert.deepEqual(result.rows[0], {
			payrollNumber: 'EMP-001',
			amount: '1537.50',
			dueDate: '2026-01-31',
		})
	})

	test('reports error for row with missing columns', () => {
		const csv = ['payroll_number,amount,date', 'EMP-001,1537.50'].join('\n')

		const result = parseCsvPaymentConfirmations(csv)
		assert.equal(result.rows.length, 0)
		assert.equal(result.errors.length, 1)
		assert.equal(result.errors[0]?.line, 2)
	})

	test('reports error for row with invalid date format', () => {
		const csv = [
			'payroll_number,amount,date',
			'EMP-001,1537.50,31-01-2026',
		].join('\n')

		const result = parseCsvPaymentConfirmations(csv)
		assert.equal(result.rows.length, 0)
		assert.equal(result.errors.length, 1)
		assert.equal(result.errors[0]?.line, 2)
	})

	test('reports error for row with non-numeric amount', () => {
		const csv = ['payroll_number,amount,date', 'EMP-001,abc,2026-01-31'].join(
			'\n',
		)

		const result = parseCsvPaymentConfirmations(csv)
		assert.equal(result.rows.length, 0)
		assert.equal(result.errors.length, 1)
		assert.equal(result.errors[0]?.line, 2)
	})

	test('skips header row and processes only data rows', () => {
		const csv = [
			'payroll_number,amount,date',
			'EMP-001,1537.50,2026-01-31',
		].join('\n')

		const result = parseCsvPaymentConfirmations(csv)
		assert.equal(result.rows.length, 1)
		assert.equal(result.rows[0]?.payrollNumber, 'EMP-001')
	})

	test('collects errors from multiple bad rows while keeping valid ones', () => {
		const csv = [
			'payroll_number,amount,date',
			'EMP-001,1537.50,2026-01-31',
			'EMP-002,bad-amount,2026-02-28',
			'EMP-003,500.00,2026-03-31',
		].join('\n')

		const result = parseCsvPaymentConfirmations(csv)
		assert.equal(result.rows.length, 2)
		assert.equal(result.errors.length, 1)
		assert.equal(result.errors[0]?.line, 3)
	})
})
