import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { InstallmentForQueue } from '~/server/queries'
import { formatDeductionsCsv } from './format-deductions-csv'

function makeInstallment(
	overrides: Partial<InstallmentForQueue> = {},
): InstallmentForQueue {
	return {
		id: 1,
		creditId: 10,
		dueDate: '2026-04-30',
		amount: '1500.00',
		hrConfirmedAt: null,
		installmentConfirmedAt: null,
		employeeName: 'Ana López',
		payrollNumber: 'NOM001',
		companyName: 'Acme Corp',
		companyId: 5,
		employeeSalaryFrequency: 'monthly',
		nextDeductionDate: '2026-04-30',
		isFinalInstallmentConfirm: false,
		installmentPosition: 1,
		installmentTotal: 6,
		...overrides,
	}
}

const HEADERS = 'empleado,numero_nomina,empresa,monto,fecha_vencimiento'

describe('formatDeductionsCsv', () => {
	test('empty array returns headers only', () => {
		const result = formatDeductionsCsv([])
		assert.equal(result, HEADERS)
	})

	test('single row with all fields populated', () => {
		const result = formatDeductionsCsv([makeInstallment()])
		const lines = result.split('\n')
		assert.equal(lines.length, 2)
		assert.equal(lines[0], HEADERS)
		assert.equal(lines[1], 'Ana López,NOM001,Acme Corp,1500.00,2026-04-30')
	})

	test('null payrollNumber renders as empty field', () => {
		const result = formatDeductionsCsv([
			makeInstallment({ payrollNumber: null }),
		])
		const lines = result.split('\n')
		assert.equal(lines[1], 'Ana López,,Acme Corp,1500.00,2026-04-30')
	})

	test('field with comma is quoted', () => {
		const result = formatDeductionsCsv([
			makeInstallment({ employeeName: 'López, Ana' }),
		])
		const lines = result.split('\n')
		assert.equal(lines[1], '"López, Ana",NOM001,Acme Corp,1500.00,2026-04-30')
	})

	test('field with double quote is escaped', () => {
		const result = formatDeductionsCsv([
			makeInstallment({ companyName: 'Acme "Corp"' }),
		])
		const lines = result.split('\n')
		assert.equal(
			lines[1],
			'Ana López,NOM001,"Acme ""Corp""",1500.00,2026-04-30',
		)
	})

	test('multiple rows appear in order', () => {
		const installments = [
			makeInstallment({ id: 1, employeeName: 'Ana López' }),
			makeInstallment({
				id: 2,
				employeeName: 'Carlos García',
				payrollNumber: 'NOM002',
				amount: '2000.00',
			}),
		]
		const result = formatDeductionsCsv(installments)
		const lines = result.split('\n')
		assert.equal(lines.length, 3)
		assert.ok(lines[1]?.startsWith('Ana López'))
		assert.ok(lines[2]?.startsWith('Carlos García'))
	})
})
