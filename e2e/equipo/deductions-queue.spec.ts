import { expect, test } from '@playwright/test'
import type { SeedDeductionsQueueResult } from '~/e2e/server/tasks'
import { cleanupDeductionsQueue, seedDeductionsQueue } from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { sumAmountStringsMxnE2e } from '../helpers/currency'
import { mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	hrAgentDeductions,
	nonHrAgentDeductions,
} from './deductions-queue.fixtures'

registerDbSpecGuards()

test.describe('HR deductions queue', () => {
	let seed: SeedDeductionsQueueResult

	test.beforeAll(async () => {
		await cleanupDeductionsQueue()
		seed = await seedDeductionsQueue(null)
	})

	test.afterAll(async () => {
		await cleanupDeductionsQueue()
	})

	test.describe('HR agent views deductions queue', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, hrAgentDeductions.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('shows deductions queue page with table', async ({ page }) => {
			await page.goto('/equipo/deductions')
			await expect(page.getByRole('main')).toBeVisible()
			await expect(mainDataTable(page)).toBeVisible()
		})

		test('shows employee, cuota, amount, unified Estado column but not a per-row due date column', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions')
			await expect(mainDataTable(page)).toBeVisible()
			const thead = mainDataTable(page).locator('thead')
			await expect(
				thead.getByRole('columnheader', { name: /empleado/i }),
			).toBeVisible()
			await expect(
				thead.getByRole('columnheader', { name: /cuota/i }),
			).toBeVisible()
			await expect(
				thead.getByRole('columnheader', { name: /monto/i }),
			).toBeVisible()
			await expect(
				thead.getByRole('columnheader', { name: /^estado$/i }),
			).toBeVisible()
			await expect(
				thead.getByRole('columnheader', { name: /fecha de pago/i }),
			).toHaveCount(0)
		})

		test('shows cuota progress matching installments format for each queue row', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions')
			await expect(mainDataTable(page)).toBeVisible()
			const tbody = mainDataTable(page).locator('tbody')
			await expect(tbody.getByText(/^1 de 2$/)).toHaveCount(
				seed.expectedRowCount,
			)
		})

		test('shows a queue-level next deduction date derived from company salary frequency', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions')
			await expect(page.getByRole('main')).toBeVisible()
			await expect(page.getByText(/próxima deducción/i).first()).toBeVisible()
		})

		test('shows company salary frequency next to the next deduction date in the queue header', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions')
			const main = page.getByRole('main')
			await expect(main.getByText(/^nómina$/i).first()).toBeVisible()
			await expect(main.getByText(/^mensual$/i).first()).toBeVisible()
		})

		test('shows exactly one row per upcoming credit (one per applicant)', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions')
			await expect(mainDataTable(page)).toBeVisible()
			await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
				seed.expectedRowCount,
			)
		})

		test('shows upcoming applicant names in the table', async ({ page }) => {
			await page.goto('/equipo/deductions')
			await expect(mainDataTable(page)).toBeVisible()
			await expect(
				page.getByText(seed.applicant1Name, { exact: true }).first(),
			).toBeVisible()
			await expect(
				page.getByText(seed.applicant2Name, { exact: true }).first(),
			).toBeVisible()
		})

		test('does not show an already HR-confirmed deduction in the queue', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions')
			await expect(mainDataTable(page)).toBeVisible()
			const tbody = mainDataTable(page).locator('tbody')
			await expect(
				tbody.getByText(seed.confirmedApplicantName, { exact: true }),
			).toHaveCount(0)
		})
	})

	test.describe('HR agent exports deductions to CSV', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, hrAgentDeductions.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('shows export CSV button on deductions page with company selected', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions')
			await expect(mainDataTable(page)).toBeVisible()
			await expect(
				page.getByRole('button', { name: /exportar csv/i }),
			).toBeVisible()
		})

		test('opens export dialog when export button is clicked', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions')
			await expect(mainDataTable(page)).toBeVisible()
			await page.getByRole('button', { name: /exportar csv/i }).click()
			const dialog = page.getByRole('dialog')
			await expect(dialog).toBeVisible()
			await expect(dialog.locator('select')).toBeVisible()
			await expect(
				dialog.getByRole('button', { name: /exportar/i }),
			).toBeVisible()
		})

		test('closes export dialog when cancel is clicked', async ({ page }) => {
			await page.goto('/equipo/deductions')
			await expect(mainDataTable(page)).toBeVisible()
			await page.getByRole('button', { name: /exportar csv/i }).click()
			const dialog = page.getByRole('dialog')
			await expect(dialog).toBeVisible()
			await dialog.getByRole('button', { name: /cancelar/i }).click()
			await expect(page.getByRole('dialog')).toHaveCount(0)
		})

		test('downloads deductions CSV for the selected pay period', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions')
			await expect(mainDataTable(page)).toBeVisible()
			await page.getByRole('button', { name: /exportar csv/i }).click()
			const dialog = page.getByRole('dialog')
			await expect(dialog).toBeVisible()
			await dialog.getByRole('button', { name: /^exportar$/i }).click()
			await expect(page.getByRole('dialog')).toHaveCount(0)
			await expect(
				page.getByText(/archivo csv descargado/i).first(),
			).toBeVisible()
		})
	})

	test.describe('HR agent views queue with an overdue credit', () => {
		let overdueSeed: SeedDeductionsQueueResult

		test.beforeAll(async () => {
			await cleanupDeductionsQueue()
			overdueSeed = await seedDeductionsQueue({ withOverdue: true })
		})

		test.beforeEach(async ({ page }) => {
			await loginPage(page, hrAgentDeductions.email)
			await setSelectedCompanyId(page, overdueSeed.companyId)
		})

		test('does not show the overdue credit in the queue', async ({ page }) => {
			await page.goto('/equipo/deductions')
			await expect(mainDataTable(page)).toBeVisible()
			await expect(
				page.getByText(overdueSeed.overdueApplicantName, { exact: true }),
			).toHaveCount(0)
		})
	})

	test.describe('Non-HR agent cannot access deductions queue', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, nonHrAgentDeductions.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('redirects to unauthorized when accessing deductions queue', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions')
			await expect(page).toHaveURL(/\/unauthorized/)
		})
	})

	test.describe('HR agent without company selected', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, hrAgentDeductions.email)
		})

		test('shows select a company empty state', async ({ page }) => {
			await page.goto('/equipo/deductions')
			await expect(
				page.getByRole('heading', { name: /selecciona una empresa/i }),
			).toBeVisible()
		})

		test('does not show the deductions table', async ({ page }) => {
			await page.goto('/equipo/deductions')
			await expect(
				page.getByRole('heading', { name: /selecciona una empresa/i }),
			).toBeVisible()
			await expect(page.getByRole('main').getByRole('table')).toHaveCount(0)
		})
	})
})

test.describe('HR deductions queue bulk confirm', () => {
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

	test('shows empty selected-total status beside nómina until a row is selected, then sums selected amounts', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions')
		const table = mainDataTable(page)
		await expect(table).toBeVisible()
		const status = page.getByRole('status', { name: /selección:/i })
		await expect(status).toBeVisible()
		await expect(status).toContainText(/sin selección/i)
		const [a1, a2] = seed.queueUpcomingRowAmounts
		const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		const row1 = table.locator('tbody tr').first()
		await row1.scrollIntoViewIfNeeded()
		await row1.getByRole('checkbox').click({ force: true })
		await expect(status).toHaveAttribute(
			'aria-label',
			new RegExp(`Selección: total ${escapeRe(sumAmountStringsMxnE2e([a1]))}`),
		)
		const row2 = table.locator('tbody tr').nth(1)
		await row2.scrollIntoViewIfNeeded()
		await row2.getByRole('checkbox').click({ force: true })
		await expect(status).toHaveAttribute(
			'aria-label',
			new RegExp(
				`Selección: total ${escapeRe(sumAmountStringsMxnE2e([a1, a2]))}`,
			),
		)
		await row2.getByRole('checkbox').click({ force: true })
		await expect(status).toHaveAttribute(
			'aria-label',
			new RegExp(`Selección: total ${escapeRe(sumAmountStringsMxnE2e([a1]))}`),
		)
		await row1.getByRole('checkbox').click({ force: true })
		await expect(status).toContainText(/sin selección/i)
	})

	test('shows a checkbox column in the deductions table', async ({ page }) => {
		await page.goto('/equipo/deductions')
		await expect(mainDataTable(page)).toBeVisible()
		await expect(
			mainDataTable(page).locator('thead').getByRole('checkbox'),
		).toBeVisible()
		const firstRow = mainDataTable(page).locator('tbody tr').first()
		await firstRow.scrollIntoViewIfNeeded()
		await expect(firstRow.getByRole('checkbox')).toBeVisible()
	})

	test('shows confirm button only when at least one row is selected', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions')
		await expect(mainDataTable(page)).toBeVisible()
		await expect(
			page.getByRole('button', { name: /confirmar \d+ deducc/i }),
		).toHaveCount(0)
		const firstRow = mainDataTable(page).locator('tbody tr').first()
		await firstRow.scrollIntoViewIfNeeded()
		await firstRow.getByRole('checkbox').click({ force: true })
		await expect(
			page.getByRole('button', { name: /confirmar \d+ deducc/i }),
		).toBeVisible()
	})

	test('confirms a single selected deduction and removes it from the table', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions')
		await expect(mainDataTable(page)).toBeVisible()
		await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
			seed.expectedRowCount,
		)
		const firstRow = mainDataTable(page).locator('tbody tr').first()
		await firstRow.scrollIntoViewIfNeeded()
		await firstRow.getByRole('checkbox').click({ force: true })
		await page.getByRole('button', { name: /confirmar \d+ deducc/i }).click()
		await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
			seed.expectedRowCount - 1,
		)
	})

	test('confirms all deductions using the header select-all checkbox', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions')
		await expect(mainDataTable(page)).toBeVisible()
		await mainDataTable(page)
			.locator('thead')
			.getByRole('checkbox')
			.click({ force: true })
		await page.getByRole('button', { name: /confirmar \d+ deducc/i }).click()
		await expect(
			page.getByText(/no hay deducciones pendientes/i).first(),
		).toBeVisible()
	})

	test('shows success feedback after confirming deductions', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions')
		await expect(mainDataTable(page)).toBeVisible()
		const firstRow = mainDataTable(page).locator('tbody tr').first()
		await firstRow.scrollIntoViewIfNeeded()
		await firstRow.getByRole('checkbox').click({ force: true })
		await page.getByRole('button', { name: /confirmar \d+ deducc/i }).click()
		await expect(page.getByText(/confirmad/i).first()).toBeVisible()
	})

	test('does not show the confirm button for a non-HR agent', async ({
		page,
	}) => {
		await loginPage(page, nonHrAgentDeductions.email)
		await setSelectedCompanyId(page, seed.companyId)
		await page.goto('/equipo/deductions')
		await expect(page).toHaveURL(/\/unauthorized/)
	})
})
