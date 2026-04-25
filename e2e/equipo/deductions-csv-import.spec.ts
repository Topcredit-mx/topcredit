import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'
import type { SeedDeductionsQueueResult } from '~/e2e/server/tasks'
import { cleanupDeductionsQueue, seedDeductionsQueue } from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import { hrAgentDeductions } from './deductions-queue.fixtures'

registerDbSpecGuards()

test.describe('HR deductions CSV import', () => {
	let seed: SeedDeductionsQueueResult

	test.beforeEach(async ({ page }) => {
		await cleanupDeductionsQueue()
		seed = await seedDeductionsQueue(null)
		await loginPage(page, hrAgentDeductions.email)
		await setSelectedCompanyId(page, seed.companyId)
	})

	test.afterEach(async () => {
		await cleanupDeductionsQueue()
	})

	test('shows import CSV button when company is selected and table is visible', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions')
		await expect(mainDataTable(page)).toBeVisible()
		await expect(
			page.getByRole('button', { name: /importar csv/i }),
		).toBeVisible()
	})

	test('opens import dialog when import button is clicked', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions')
		await expect(mainDataTable(page)).toBeVisible()
		await page.getByRole('button', { name: /importar csv/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		await expect(dialog.locator('input[type="file"]')).toHaveCount(1)
	})

	test('closes import dialog when cancel is clicked', async ({ page }) => {
		await page.goto('/equipo/deductions')
		await expect(mainDataTable(page)).toBeVisible()
		await page.getByRole('button', { name: /importar csv/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		await page.locator('[data-slot="dialog-close"]').click()
		await expect(page.getByRole('dialog')).toHaveCount(0)
	})

	test('uploads valid CSV, shows preview with matched rows, confirms, rows disappear from table', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions')
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
			name: 'deducciones.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})
		await expect(page.locator('#deductions-import-csv-desc')).toBeVisible({
			timeout: 15_000,
		})
		await expect(
			dialog.getByText(/listas? para confirmar/i).first(),
		).toBeVisible()
		await dialog.getByRole('button', { name: /confirmar/i }).click()
		await expect(page.getByRole('dialog')).toHaveCount(0)
		await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
			seed.expectedRowCount - 1,
		)
	})

	test('shows error table with column detail when CSV has invalid format rows', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions')
		await expect(mainDataTable(page)).toBeVisible()
		await page.getByRole('button', { name: /importar csv/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const csvContent = [
			'payroll_number,amount,date',
			'DEDUCT001,not-a-number,2026-01-31',
		].join('\n')
		await dialog.locator('input[type="file"]').setInputFiles({
			name: 'deducciones-error.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})
		await expect(page.locator('#deductions-import-csv-desc')).toBeVisible({
			timeout: 15_000,
		})
		await expect(dialog.getByText(/filas con errores/i).first()).toBeVisible()
		const errTable = dialog.locator('table')
		await expect(errTable).toBeVisible()
		const row = errTable.locator('tbody tr').first()
		await expect(row).toContainText('DEDUCT001')
		await expect(row).toContainText('not-a-number')
	})

	test('shows no-match errors for rows not belonging to the selected company', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions')
		await expect(mainDataTable(page)).toBeVisible()
		await page.getByRole('button', { name: /importar csv/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const csvContent = [
			'payroll_number,amount,date',
			'UNKNOWN999,1000.00,2026-01-31',
		].join('\n')
		await dialog.locator('input[type="file"]').setInputFiles({
			name: 'deducciones-nomatch.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})
		await expect(page.locator('#deductions-import-csv-desc')).toBeVisible({
			timeout: 15_000,
		})
		await expect(dialog.getByText(/filas con errores/i).first()).toBeVisible()
		const row = dialog.locator('table tbody tr').first()
		await expect(row).toContainText('UNKNOWN999')
		await expect(row).toContainText(/sin coincidencia/i)
	})

	test('shows warning in preview when CSV row is already confirmed', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions')
		await expect(mainDataTable(page)).toBeVisible()
		await page.getByRole('button', { name: /importar csv/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const dueDateISO = seed.credit4HrConfirmedPaymentDueDateISO
		const csvContent = [
			'payroll_number,amount,date',
			`DEDUCT004,15375.00,${dueDateISO}`,
		].join('\n')
		await dialog.locator('input[type="file"]').setInputFiles({
			name: 'deducciones-dup.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})
		await expect(page.locator('#deductions-import-csv-desc')).toBeVisible({
			timeout: 15_000,
		})
		await expect(dialog.getByText(/ya confirmada/i).first()).toBeVisible()
		await expect(dialog.getByText('DEDUCT004').first()).toBeVisible()
	})

	test('mixed CSV: confirms the unconfirmed row and warns about the already-confirmed one', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions')
		await expect(mainDataTable(page)).toBeVisible()
		await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
			seed.expectedRowCount,
		)
		await page.getByRole('button', { name: /importar csv/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const { payrollNumber, amount, dueDateISO } = seed.firstInstallmentForCsv
		const credit4Due = seed.credit4HrConfirmedPaymentDueDateISO
		const csvContent = [
			'payroll_number,amount,date',
			`${payrollNumber},${amount},${dueDateISO}`,
			`DEDUCT004,15375.00,${credit4Due}`,
		].join('\n')
		await dialog.locator('input[type="file"]').setInputFiles({
			name: 'deducciones-mixed.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})
		await expect(page.locator('#deductions-import-csv-desc')).toBeVisible({
			timeout: 15_000,
		})
		await expect(
			dialog.getByText(/listas? para confirmar/i).first(),
		).toBeVisible()
		await expect(
			dialog.getByText(/filas ya confirmadas/i).first(),
		).toBeVisible()
		await expect(dialog.getByText('DEDUCT004').first()).toBeVisible()
		await dialog.getByRole('button', { name: /confirmar/i }).click()
		await expect(page.getByRole('dialog')).toHaveCount(0)
		await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
			seed.expectedRowCount - 1,
		)
	})

	test('mixed CSV: 1 valid, 1 already-confirmed, 1 error — confirms only the valid row', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions')
		await expect(mainDataTable(page)).toBeVisible()
		await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
			seed.expectedRowCount,
		)
		await page.getByRole('button', { name: /importar csv/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const { payrollNumber, amount, dueDateISO } = seed.firstInstallmentForCsv
		const credit4Due = seed.credit4HrConfirmedPaymentDueDateISO
		const csvContent = [
			'payroll_number,amount,date',
			`${payrollNumber},${amount},${dueDateISO}`,
			`DEDUCT004,15375.00,${credit4Due}`,
			'UNKNOWN999,not-a-number,2026-01-31',
		].join('\n')
		await dialog.locator('input[type="file"]').setInputFiles({
			name: 'deducciones-all-three.csv',
			mimeType: 'text/csv',
			buffer: Buffer.from(csvContent),
		})
		await expect(page.locator('#deductions-import-csv-desc')).toBeVisible({
			timeout: 15_000,
		})
		await expect(
			dialog.getByText(/listas? para confirmar/i).first(),
		).toBeVisible()
		await expect(
			dialog.getByText(/filas ya confirmadas/i).first(),
		).toBeVisible()
		await expect(dialog.getByText('DEDUCT004').first()).toBeVisible()
		await expect(dialog.getByText(/filas con errores/i).first()).toBeVisible()
		await expect(dialog.getByText('UNKNOWN999').first()).toBeVisible()
		await dialog.getByRole('button', { name: /confirmar/i }).click()
		await expect(page.getByRole('dialog')).toHaveCount(0)
		await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
			seed.expectedRowCount - 1,
		)
	})
})
