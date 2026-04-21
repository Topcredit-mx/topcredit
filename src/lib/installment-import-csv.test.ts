import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
	classifyInstallmentCsvImportRows,
	makeInstallmentImportKey,
} from './installment-import-csv'

describe('makeInstallmentImportKey', () => {
	test('joins fields with pipe', () => {
		assert.equal(
			makeInstallmentImportKey('PN1', '100.00', '2026-02-28'),
			'PN1|100.00|2026-02-28',
		)
	})
})

describe('classifyInstallmentCsvImportRows', () => {
	const baseCandidate = {
		paymentId: 1,
		companyId: 10,
		hrConfirmedAt: new Date('2026-01-01'),
		installmentConfirmedAt: null as Date | null,
	}

	test('matches when HR confirmed and receipt pending and ability allows', () => {
		const map = new Map([
			[
				makeInstallmentImportKey('PN', '50.00', '2026-03-01'),
				{ ...baseCandidate, paymentId: 99 },
			],
		])
		const r = classifyInstallmentCsvImportRows(
			[
				{
					line: 2,
					payrollNumber: 'PN',
					amount: '50.00',
					dueDate: '2026-03-01',
				},
			],
			map,
			() => true,
		)
		assert.deepEqual(r.matchedPaymentIds, [99])
		assert.equal(r.errors.length, 0)
		assert.equal(r.warnings.length, 0)
	})

	test('no-match when key missing from map', () => {
		const r = classifyInstallmentCsvImportRows(
			[
				{
					line: 2,
					payrollNumber: 'X',
					amount: '1.00',
					dueDate: '2026-01-01',
				},
			],
			new Map(),
			() => true,
		)
		assert.equal(r.matchedPaymentIds.length, 0)
		assert.equal(r.errors.length, 1)
		assert.equal(r.errors[0]?.message, 'no-match')
	})

	test('no-match when ability denies', () => {
		const map = new Map([
			[
				makeInstallmentImportKey('PN', '1.00', '2026-01-01'),
				{ ...baseCandidate },
			],
		])
		const r = classifyInstallmentCsvImportRows(
			[{ line: 2, payrollNumber: 'PN', amount: '1.00', dueDate: '2026-01-01' }],
			map,
			() => false,
		)
		assert.equal(r.errors[0]?.message, 'no-match')
	})

	test('warns already-received', () => {
		const map = new Map([
			[
				makeInstallmentImportKey('PN', '1.00', '2026-01-01'),
				{
					...baseCandidate,
					installmentConfirmedAt: new Date('2026-01-02'),
				},
			],
		])
		const r = classifyInstallmentCsvImportRows(
			[{ line: 2, payrollNumber: 'PN', amount: '1.00', dueDate: '2026-01-01' }],
			map,
			() => true,
		)
		assert.equal(r.warnings.length, 1)
		assert.equal(r.warnings[0]?.message, 'already-received')
	})

	test('warns not-hr-confirmed', () => {
		const map = new Map([
			[
				makeInstallmentImportKey('PN', '1.00', '2026-01-01'),
				{
					...baseCandidate,
					hrConfirmedAt: null,
					installmentConfirmedAt: null,
				},
			],
		])
		const r = classifyInstallmentCsvImportRows(
			[{ line: 2, payrollNumber: 'PN', amount: '1.00', dueDate: '2026-01-01' }],
			map,
			() => true,
		)
		assert.equal(r.warnings.length, 1)
		assert.equal(r.warnings[0]?.message, 'not-hr-confirmed')
	})

	test('mixed: one matched one warning', () => {
		const map = new Map([
			[
				makeInstallmentImportKey('A', '10.00', '2026-01-01'),
				{ ...baseCandidate, paymentId: 1 },
			],
			[
				makeInstallmentImportKey('B', '20.00', '2026-01-02'),
				{
					...baseCandidate,
					paymentId: 2,
					installmentConfirmedAt: new Date(),
				},
			],
		])
		const r = classifyInstallmentCsvImportRows(
			[
				{ line: 2, payrollNumber: 'A', amount: '10.00', dueDate: '2026-01-01' },
				{ line: 3, payrollNumber: 'B', amount: '20.00', dueDate: '2026-01-02' },
			],
			map,
			() => true,
		)
		assert.deepEqual(r.matchedPaymentIds, [1])
		assert.equal(r.warnings.length, 1)
		assert.equal(r.errors.length, 0)
	})
})
