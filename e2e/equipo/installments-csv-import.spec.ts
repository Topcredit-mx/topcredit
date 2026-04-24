import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'
import type { SeedInstallmentsQueueResult } from '~/e2e/server/tasks'
import {
	cleanupInstallmentsQueue,
	seedInstallmentsQueue,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import { installmentAgentQueue } from './installments-agents.fixtures'

registerDbSpecGuards()

test.describe('Installments queue CSV import', () => {
	let seed: SeedInstallmentsQueueResult

	test.beforeEach(async ({ page }) => {
		await cleanupInstallmentsQueue()
		seed = await seedInstallmentsQueue()
		await loginPage(page, installmentAgentQueue.email)
		await setSelectedCompanyId(page, seed.companyId)
	})

	test.afterEach(async () => {
		await cleanupInstallmentsQueue()
	})

	test('shows import CSV button when company is selected and table is visible', async ({
		page,
	}) => {
		await page.goto('/equipo/installments')
		await expect(mainDataTable(page)).toBeVisible()
		await expect(
			page.getByRole('button', { name: /importar csv/i }),
		).toBeVisible()
	})

	test('opens import dialog when import button is clicked', async ({
		page,
	}) => {
		await page.goto('/equipo/installments')
		await expect(mainDataTable(page)).toBeVisible()
		await page.getByRole('button', { name: /importar csv/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		await expect(dialog.locator('input[type="file"]')).toHaveCount(1)
	})

	test('closes import dialog when cancel is clicked', async ({ page }) => {
		await page.goto('/equipo/installments')
		await expect(mainDataTable(page)).toBeVisible()
		await page.getByRole('button', { name: /importar csv/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		await page.locator('[data-slot="dialog-close"]').click()
		await expect(page.getByRole('dialog')).toHaveCount(0)
	})

	test('uploads valid CSV, shows preview, confirms, shows success toast and updated queue', async ({
		page,
	}) => {
		await page.goto('/equipo/installments')
		await expect(mainDataTable(page)).toBeVisible()
		await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
			seed.expectedRowCount,
		)
		await page.getByRole('button', { name: /importar csv/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const { payrollNumber, amount, dueDateISO } = seed.firstInstallmentForCsv
		const csvContent = `payroll_number,amount,date\n${payrollNumber},${amount},${dueDateISO}`
		await dialog.locator('input[type="file"]').setInputFiles({
			name: 'instalaciones.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})
		await expect(page.locator('#installments-import-csv-desc')).toBeVisible({
			timeout: 15_000,
		})
		await expect(
			dialog.getByText(/lista(s)? para confirmar/i).first(),
		).toBeVisible()
		await dialog.getByRole('button', { name: /confirmar/i }).click()
		await expect(
			page.getByText(/1 instalación confirmada/i).first(),
		).toBeVisible()
		await expect(page.getByRole('dialog')).toHaveCount(0)
		await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
			seed.expectedRowCountAfterConfirmingFirstCsvMatch,
		)
	})

	test('shows error table when CSV has invalid format rows', async ({
		page,
	}) => {
		await page.goto('/equipo/installments')
		await expect(mainDataTable(page)).toBeVisible()
		await page.getByRole('button', { name: /importar csv/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const csvContent = [
			'payroll_number,amount,date',
			'INST002,not-a-number,2026-01-31',
		].join('\n')
		await dialog.locator('input[type="file"]').setInputFiles({
			name: 'instalaciones-error.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})
		await expect(page.locator('#installments-import-csv-desc')).toBeVisible({
			timeout: 15_000,
		})
		await expect(dialog.getByText(/filas con errores/i).first()).toBeVisible()
		const errTable = dialog.locator('table')
		await expect(errTable).toBeVisible()
		const row = errTable.locator('tbody tr').first()
		await expect(row).toContainText('INST002')
		await expect(row).toContainText('not-a-number')
	})

	test('shows no-match errors for rows not in the selected company data', async ({
		page,
	}) => {
		await page.goto('/equipo/installments')
		await expect(mainDataTable(page)).toBeVisible()
		await page.getByRole('button', { name: /importar csv/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const csvContent = [
			'payroll_number,amount,date',
			'UNKNOWN999,1000.00,2026-01-31',
		].join('\n')
		await dialog.locator('input[type="file"]').setInputFiles({
			name: 'instalaciones-nomatch.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})
		await expect(page.locator('#installments-import-csv-desc')).toBeVisible({
			timeout: 15_000,
		})
		await expect(dialog.getByText(/filas con errores/i).first()).toBeVisible()
		const row = dialog.locator('table tbody tr').first()
		await expect(row).toContainText('UNKNOWN999')
		await expect(row).toContainText(/sin coincidencia/i)
	})

	test('shows warning when CSV row is already installment-confirmed', async ({
		page,
	}) => {
		await page.goto('/equipo/installments')
		await expect(mainDataTable(page)).toBeVisible()
		await page.getByRole('button', { name: /importar csv/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const { payrollNumber, amount, dueDateISO } =
			seed.alreadyReceivedInstallmentForCsv
		const csvContent = [
			'payroll_number,amount,date',
			`${payrollNumber},${amount},${dueDateISO}`,
		].join('\n')
		await dialog.locator('input[type="file"]').setInputFiles({
			name: 'instalaciones-dup.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})
		await expect(page.locator('#installments-import-csv-desc')).toBeVisible({
			timeout: 15_000,
		})
		await expect(dialog.getByText(/filas omitidas/i).first()).toBeVisible()
		await expect(
			dialog.getByText(/instalación ya confirmada/i).first(),
		).toBeVisible()
		await expect(dialog.getByText(payrollNumber, { exact: true })).toBeVisible()
	})

	test('shows not-hr-confirmed warning for matching row awaiting HR', async ({
		page,
	}) => {
		await page.goto('/equipo/installments')
		await expect(mainDataTable(page)).toBeVisible()
		await page.getByRole('button', { name: /importar csv/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const { payrollNumber, amount, dueDateISO } =
			seed.notHrConfirmedInstallmentForCsv
		const csvContent = [
			'payroll_number,amount,date',
			`${payrollNumber},${amount},${dueDateISO}`,
		].join('\n')
		await dialog.locator('input[type="file"]').setInputFiles({
			name: 'instalaciones-sin-rh.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})
		await expect(page.locator('#installments-import-csv-desc')).toBeVisible({
			timeout: 15_000,
		})
		await expect(dialog.getByText(/filas omitidas/i).first()).toBeVisible()
		await expect(
			dialog.getByText(/rh aún no confirmada/i).first(),
		).toBeVisible()
	})

	test('mixed CSV: confirms the pending row and warns about already-received', async ({
		page,
	}) => {
		await page.goto('/equipo/installments')
		await expect(mainDataTable(page)).toBeVisible()
		await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
			seed.expectedRowCount,
		)
		await page.getByRole('button', { name: /importar csv/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const pending = seed.firstInstallmentForCsv
		const received = seed.alreadyReceivedInstallmentForCsv
		const csvContent = [
			'payroll_number,amount,date',
			`${pending.payrollNumber},${pending.amount},${pending.dueDateISO}`,
			`${received.payrollNumber},${received.amount},${received.dueDateISO}`,
		].join('\n')
		await dialog.locator('input[type="file"]').setInputFiles({
			name: 'instalaciones-mixed.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})
		await expect(page.locator('#installments-import-csv-desc')).toBeVisible({
			timeout: 15_000,
		})
		await expect(
			dialog.getByText(/lista(s)? para confirmar/i).first(),
		).toBeVisible()
		await expect(dialog.getByText(/filas omitidas/i).first()).toBeVisible()
		await expect(
			dialog.getByText(received.payrollNumber, { exact: true }),
		).toBeVisible()
		await dialog.getByRole('button', { name: /confirmar/i }).click()
		await expect(
			page.getByText(/1 instalación confirmada/i).first(),
		).toBeVisible()
		await expect(page.getByRole('dialog')).toHaveCount(0)
		await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
			seed.expectedRowCountAfterConfirmingFirstCsvMatch,
		)
	})

	test('mixed CSV: 1 valid, 1 already-received, 1 parse error — confirms only the valid row', async ({
		page,
	}) => {
		await page.goto('/equipo/installments')
		await expect(mainDataTable(page)).toBeVisible()
		await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
			seed.expectedRowCount,
		)
		await page.getByRole('button', { name: /importar csv/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const pending = seed.firstInstallmentForCsv
		const received = seed.alreadyReceivedInstallmentForCsv
		const csvContent = [
			'payroll_number,amount,date',
			`${pending.payrollNumber},${pending.amount},${pending.dueDateISO}`,
			`${received.payrollNumber},${received.amount},${received.dueDateISO}`,
			'UNKNOWN999,not-a-number,2026-01-31',
		].join('\n')
		await dialog.locator('input[type="file"]').setInputFiles({
			name: 'instalaciones-all-three.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})
		await expect(page.locator('#installments-import-csv-desc')).toBeVisible({
			timeout: 15_000,
		})
		await expect(
			dialog.getByText(/lista(s)? para confirmar/i).first(),
		).toBeVisible()
		await expect(dialog.getByText(/filas omitidas/i).first()).toBeVisible()
		await expect(
			dialog.getByText(received.payrollNumber, { exact: true }),
		).toBeVisible()
		await expect(dialog.getByText(/filas con errores/i).first()).toBeVisible()
		await expect(dialog.getByText('UNKNOWN999', { exact: true })).toBeVisible()
		await dialog.getByRole('button', { name: /confirmar/i }).click()
		await expect(
			page.getByText(/1 instalación confirmada/i).first(),
		).toBeVisible()
		await expect(page.getByRole('dialog')).toHaveCount(0)
		await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
			seed.expectedRowCountAfterConfirmingFirstCsvMatch,
		)
	})
})
