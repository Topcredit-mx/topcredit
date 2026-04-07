import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
	allPaymentsConfirmed,
	canConfirmPayment,
	parseCsvPaymentConfirmations,
} from './payment-confirmation'

describe('canConfirmPayment', () => {
	test('returns true for pending payment', () => {
		assert.equal(canConfirmPayment('pending'), true)
	})

	test('returns false for already confirmed payment', () => {
		assert.equal(canConfirmPayment('confirmed'), false)
	})
})

describe('allPaymentsConfirmed', () => {
	test('returns true for empty array', () => {
		assert.equal(allPaymentsConfirmed([]), true)
	})

	test('returns true when all payments are confirmed', () => {
		assert.equal(
			allPaymentsConfirmed([
				{ status: 'confirmed' },
				{ status: 'confirmed' },
				{ status: 'confirmed' },
			]),
			true,
		)
	})

	test('returns false when any payment is pending', () => {
		assert.equal(
			allPaymentsConfirmed([
				{ status: 'confirmed' },
				{ status: 'pending' },
				{ status: 'confirmed' },
			]),
			false,
		)
	})

	test('returns false when all payments are pending', () => {
		assert.equal(
			allPaymentsConfirmed([{ status: 'pending' }, { status: 'pending' }]),
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
