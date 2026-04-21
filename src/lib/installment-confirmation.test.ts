import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
	allInstallmentsFullyConfirmed,
	canConfirmInstallment,
	canConfirmInstallmentForCreditDetailRow,
	canConfirmInstallmentInQueue,
	canHrConfirm,
	isFullyConfirmed,
	isInstallmentOverdueFromDb,
	isInstallmentOverdueInQueue,
	parseCsvInstallmentConfirmations,
} from './installment-confirmation'

const NOW = new Date('2026-01-31T10:00:00Z')

describe('canHrConfirm', () => {
	test('returns true when hrConfirmedAt is null', () => {
		assert.equal(canHrConfirm({ hrConfirmedAt: null }), true)
	})

	test('returns false when hrConfirmedAt is set', () => {
		assert.equal(canHrConfirm({ hrConfirmedAt: NOW }), false)
	})
})

describe('canConfirmInstallmentForCreditDetailRow', () => {
	const today = new Date('2023-01-05T12:00:00.000Z')

	test('allows delayed installment with HR confirmed and installment pending within period', () => {
		assert.equal(
			canConfirmInstallmentForCreditDetailRow(
				{
					hrConfirmedAt: new Date('2022-12-31T12:00:00.000Z'),
					installmentConfirmedAt: null,
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
			canConfirmInstallmentForCreditDetailRow(
				{
					hrConfirmedAt: new Date('2023-01-31T12:00:00.000Z'),
					installmentConfirmedAt: null,
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
			canConfirmInstallmentForCreditDetailRow(
				{
					hrConfirmedAt: new Date('2023-02-28T12:00:00.000Z'),
					installmentConfirmedAt: null,
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
			canConfirmInstallmentForCreditDetailRow(
				{
					hrConfirmedAt: null,
					installmentConfirmedAt: null,
					dueDate: new Date('2022-12-31T12:00:00.000Z'),
					employeeSalaryFrequency: 'monthly',
				},
				today,
			),
			false,
		)
	})
})

describe('canConfirmInstallment', () => {
	test('returns false when hrConfirmedAt is null', () => {
		assert.equal(
			canConfirmInstallment({
				hrConfirmedAt: null,
				installmentConfirmedAt: null,
			}),
			false,
		)
	})

	test('returns true when hrConfirmedAt is set and installmentConfirmedAt is null', () => {
		assert.equal(
			canConfirmInstallment({
				hrConfirmedAt: NOW,
				installmentConfirmedAt: null,
			}),
			true,
		)
	})

	test('returns false when both timestamps are set', () => {
		assert.equal(
			canConfirmInstallment({
				hrConfirmedAt: NOW,
				installmentConfirmedAt: NOW,
			}),
			false,
		)
	})
})

describe('canConfirmInstallmentInQueue', () => {
	test('returns false when hrConfirmedAt is null (ISO strings)', () => {
		assert.equal(
			canConfirmInstallmentInQueue({
				hrConfirmedAt: null,
				installmentConfirmedAt: null,
			}),
			false,
		)
	})

	test('returns true when hr is set and installment confirmation is null', () => {
		assert.equal(
			canConfirmInstallmentInQueue({
				hrConfirmedAt: '2026-01-15T12:00:00.000Z',
				installmentConfirmedAt: null,
			}),
			true,
		)
	})

	test('returns false when both are set', () => {
		assert.equal(
			canConfirmInstallmentInQueue({
				hrConfirmedAt: '2026-01-15T12:00:00.000Z',
				installmentConfirmedAt: '2026-01-20T12:00:00.000Z',
			}),
			false,
		)
	})
})

describe('isInstallmentOverdueInQueue', () => {
	const today = new Date('2026-01-20T12:00:00.000Z')

	test('returns true when due date is before today and HR has not confirmed', () => {
		assert.equal(
			isInstallmentOverdueInQueue(
				{
					dueDate: '2025-12-31T12:00:00.000Z',
					hrConfirmedAt: null,
					installmentConfirmedAt: null,
				},
				today,
			),
			true,
		)
	})

	test('returns false when due date is not before today', () => {
		assert.equal(
			isInstallmentOverdueInQueue(
				{
					dueDate: '2026-01-31T12:00:00.000Z',
					hrConfirmedAt: '2026-01-10T12:00:00.000Z',
					installmentConfirmedAt: null,
				},
				today,
			),
			false,
		)
	})

	test('returns true when HR confirmed, installment pending, and due date is before today', () => {
		assert.equal(
			isInstallmentOverdueInQueue(
				{
					dueDate: '2025-12-31T12:00:00.000Z',
					hrConfirmedAt: '2026-01-01T12:00:00.000Z',
					installmentConfirmedAt: null,
				},
				today,
			),
			true,
		)
	})

	test('returns false when both HR and installment are confirmed', () => {
		assert.equal(
			isInstallmentOverdueInQueue(
				{
					dueDate: '2025-12-31T12:00:00.000Z',
					hrConfirmedAt: '2026-01-01T12:00:00.000Z',
					installmentConfirmedAt: '2026-01-02T12:00:00.000Z',
				},
				today,
			),
			false,
		)
	})
})

describe('isInstallmentOverdueFromDb', () => {
	const today = new Date('2026-01-20T12:00:00.000Z')

	test('returns true when HR confirmed, installment pending, and due is before today', () => {
		assert.equal(
			isInstallmentOverdueFromDb(
				{
					hrConfirmedAt: new Date('2026-01-01T12:00:00.000Z'),
					installmentConfirmedAt: null,
					dueDate: new Date('2025-12-31T12:00:00.000Z'),
				},
				today,
			),
			true,
		)
	})

	test('returns true when HR pending and due is before today', () => {
		assert.equal(
			isInstallmentOverdueFromDb(
				{
					hrConfirmedAt: null,
					installmentConfirmedAt: null,
					dueDate: new Date('2025-12-31T12:00:00.000Z'),
				},
				today,
			),
			true,
		)
	})

	test('returns false when due date is today or later', () => {
		assert.equal(
			isInstallmentOverdueFromDb(
				{
					hrConfirmedAt: new Date('2026-01-01T12:00:00.000Z'),
					installmentConfirmedAt: null,
					dueDate: new Date('2026-01-20T12:00:00.000Z'),
				},
				today,
			),
			false,
		)
	})

	test('returns false when both confirmations are set', () => {
		assert.equal(
			isInstallmentOverdueFromDb(
				{
					hrConfirmedAt: new Date('2026-01-01T12:00:00.000Z'),
					installmentConfirmedAt: new Date('2026-01-02T12:00:00.000Z'),
					dueDate: new Date('2025-12-31T12:00:00.000Z'),
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
			isFullyConfirmed({ hrConfirmedAt: null, installmentConfirmedAt: null }),
			false,
		)
	})

	test('returns false when only hrConfirmedAt is set', () => {
		assert.equal(
			isFullyConfirmed({ hrConfirmedAt: NOW, installmentConfirmedAt: null }),
			false,
		)
	})

	test('returns false when only installmentConfirmedAt is set', () => {
		assert.equal(
			isFullyConfirmed({ hrConfirmedAt: null, installmentConfirmedAt: NOW }),
			false,
		)
	})

	test('returns true when both timestamps are set', () => {
		assert.equal(
			isFullyConfirmed({ hrConfirmedAt: NOW, installmentConfirmedAt: NOW }),
			true,
		)
	})
})

describe('allInstallmentsFullyConfirmed', () => {
	test('returns true for empty array', () => {
		assert.equal(allInstallmentsFullyConfirmed([]), true)
	})

	test('returns true when all credit payments have both timestamps set', () => {
		assert.equal(
			allInstallmentsFullyConfirmed([
				{ hrConfirmedAt: NOW, installmentConfirmedAt: NOW },
				{ hrConfirmedAt: NOW, installmentConfirmedAt: NOW },
			]),
			true,
		)
	})

	test('returns false when any credit payment has no hrConfirmedAt', () => {
		assert.equal(
			allInstallmentsFullyConfirmed([
				{ hrConfirmedAt: NOW, installmentConfirmedAt: NOW },
				{ hrConfirmedAt: null, installmentConfirmedAt: null },
			]),
			false,
		)
	})

	test('returns false when any credit payment has hrConfirmedAt but no installmentConfirmedAt', () => {
		assert.equal(
			allInstallmentsFullyConfirmed([
				{ hrConfirmedAt: NOW, installmentConfirmedAt: NOW },
				{ hrConfirmedAt: NOW, installmentConfirmedAt: null },
			]),
			false,
		)
	})

	test('returns false when all credit payments are pending', () => {
		assert.equal(
			allInstallmentsFullyConfirmed([
				{ hrConfirmedAt: null, installmentConfirmedAt: null },
				{ hrConfirmedAt: null, installmentConfirmedAt: null },
			]),
			false,
		)
	})
})

describe('parseCsvInstallmentConfirmations', () => {
	test('parses valid CSV with multiple rows', () => {
		const csv = [
			'payroll_number,amount,date',
			'EMP-001,1537.50,2026-01-31',
			'EMP-002,2000.00,2026-02-28',
			'EMP-003,500.00,2026-03-31',
		].join('\n')

		const result = parseCsvInstallmentConfirmations(csv)

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
		const result = parseCsvInstallmentConfirmations(csv)
		assert.equal(result.rows.length, 0)
		assert.equal(result.errors.length, 0)
	})

	test('returns empty rows for empty string', () => {
		const result = parseCsvInstallmentConfirmations('')
		assert.equal(result.rows.length, 0)
		assert.equal(result.errors.length, 0)
	})

	test('trims whitespace from values', () => {
		const csv = [
			'payroll_number,amount,date',
			'  EMP-001 , 1537.50 , 2026-01-31 ',
		].join('\n')

		const result = parseCsvInstallmentConfirmations(csv)
		assert.equal(result.errors.length, 0)
		assert.deepEqual(result.rows[0], {
			payrollNumber: 'EMP-001',
			amount: '1537.50',
			dueDate: '2026-01-31',
		})
	})

	test('reports error for row with missing columns', () => {
		const csv = ['payroll_number,amount,date', 'EMP-001,1537.50'].join('\n')

		const result = parseCsvInstallmentConfirmations(csv)
		assert.equal(result.rows.length, 0)
		assert.equal(result.errors.length, 1)
		assert.equal(result.errors[0]?.line, 2)
	})

	test('reports error for row with invalid date format', () => {
		const csv = [
			'payroll_number,amount,date',
			'EMP-001,1537.50,31-01-2026',
		].join('\n')

		const result = parseCsvInstallmentConfirmations(csv)
		assert.equal(result.rows.length, 0)
		assert.equal(result.errors.length, 1)
		assert.equal(result.errors[0]?.line, 2)
	})

	test('reports error for row with non-numeric amount', () => {
		const csv = ['payroll_number,amount,date', 'EMP-001,abc,2026-01-31'].join(
			'\n',
		)

		const result = parseCsvInstallmentConfirmations(csv)
		assert.equal(result.rows.length, 0)
		assert.equal(result.errors.length, 1)
		assert.equal(result.errors[0]?.line, 2)
	})

	test('skips header row and processes only data rows', () => {
		const csv = [
			'payroll_number,amount,date',
			'EMP-001,1537.50,2026-01-31',
		].join('\n')

		const result = parseCsvInstallmentConfirmations(csv)
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

		const result = parseCsvInstallmentConfirmations(csv)
		assert.equal(result.rows.length, 2)
		assert.equal(result.errors.length, 1)
		assert.equal(result.errors[0]?.line, 3)
	})
})
