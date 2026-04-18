import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { InstallmentForQueue } from '~/server/queries'
import { formatPendingPaymentReceiptsCsv } from './format-pending-payment-receipts-csv'

const HEADERS =
	'empleado,numero_nomina,empresa,monto,fecha_de_pago,proxima_deduccion,deduccion_rh,recepcion'

function makeInstallment(
	overrides: Partial<InstallmentForQueue> = {},
): InstallmentForQueue {
	return {
		id: 1,
		creditId: 10,
		dueDate: '2026-04-30T00:00:00.000Z',
		amount: '1500.00',
		hrConfirmedAt: '2026-04-01T00:00:00.000Z',
		paymentsConfirmedAt: null,
		employeeName: 'Ana López',
		payrollNumber: 'NOM001',
		companyName: 'Acme Corp',
		companyId: 5,
		employeeSalaryFrequency: 'monthly',
		nextDeductionDate: '2026-05-15T00:00:00.000Z',
		...overrides,
	}
}

describe('formatPendingPaymentReceiptsCsv', () => {
	test('empty array returns headers only', () => {
		const result = formatPendingPaymentReceiptsCsv([])
		assert.equal(result, HEADERS)
	})

	test('single row with receipt pending after HR confirmed', () => {
		const result = formatPendingPaymentReceiptsCsv([makeInstallment()])
		const lines = result.split('\n')
		assert.equal(lines.length, 2)
		assert.equal(lines[0], HEADERS)
		assert.equal(
			lines[1],
			'Ana López,NOM001,Acme Corp,1500.00,2026-04-30,2026-05-15,Confirmado,Pendiente',
		)
	})

	test('escapes employee name with comma', () => {
		const result = formatPendingPaymentReceiptsCsv([
			makeInstallment({ employeeName: 'López, Ana' }),
		])
		const lines = result.split('\n')
		assert.equal(lines[1]?.startsWith('"López, Ana"'), true)
	})

	test('awaiting HR receipt label when hr not confirmed', () => {
		const result = formatPendingPaymentReceiptsCsv([
			makeInstallment({ hrConfirmedAt: null, paymentsConfirmedAt: null }),
		])
		const lines = result.split('\n')
		assert.equal(
			lines[1],
			'Ana López,NOM001,Acme Corp,1500.00,2026-04-30,2026-05-15,Pendiente,En espera de RH',
		)
	})

	test('receipt confirmed label', () => {
		const result = formatPendingPaymentReceiptsCsv([
			makeInstallment({
				hrConfirmedAt: '2026-04-01T00:00:00.000Z',
				paymentsConfirmedAt: '2026-04-10T00:00:00.000Z',
			}),
		])
		const lines = result.split('\n')
		assert.equal(lines[1]?.endsWith('Confirmado,Confirmado'), true)
	})
})
