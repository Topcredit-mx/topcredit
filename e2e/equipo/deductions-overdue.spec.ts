import { expect, test } from '@playwright/test'
import type { SeedDeductionsQueueResult } from '~/e2e/server/tasks'
import { cleanupDeductionsQueue, seedDeductionsQueue } from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { findTableRow, mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	hrAgentDeductions,
	nonHrAgentDeductions,
} from './deductions-queue.fixtures'

registerDbSpecGuards()

test.describe('HR overdue deductions list', () => {
	let seed: SeedDeductionsQueueResult

	test.beforeAll(async () => {
		await cleanupDeductionsQueue()
		seed = await seedDeductionsQueue({ withOverdue: true })
	})

	test.afterAll(async () => {
		await cleanupDeductionsQueue()
	})

	test.describe('HR agent with company selected', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, hrAgentDeductions.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('shows the overdue deductions page with a table', async ({ page }) => {
			await page.goto('/equipo/deductions/overdue')
			await expect(page.getByRole('main')).toBeVisible()
			await expect(mainDataTable(page)).toBeVisible()
		})

		test('shows the overdue applicant in the table', async ({ page }) => {
			await page.goto('/equipo/deductions/overdue')
			await expect(mainDataTable(page)).toBeVisible()
			await expect(
				page.getByText(seed.overdueApplicantName, { exact: true }).first(),
			).toBeVisible()
		})

		test('shows only overdue credits — not upcoming-only applicants', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions/overdue')
			await expect(mainDataTable(page)).toBeVisible()
			await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(2)
			const tbody = mainDataTable(page).locator('tbody')
			await expect(
				tbody.getByText(seed.applicant2Name, { exact: true }),
			).toHaveCount(0)
		})

		test('shows amount and overdue-since columns', async ({ page }) => {
			await page.goto('/equipo/deductions/overdue')
			await expect(mainDataTable(page)).toBeVisible()
			const thead = mainDataTable(page).locator('thead')
			await expect(
				thead.getByRole('columnheader', { name: /monto/i }),
			).toBeVisible()
			await expect(
				thead.getByRole('columnheader', { name: /atrasado desde/i }),
			).toBeVisible()
		})

		test('shows a back link to the deductions page', async ({ page }) => {
			await page.goto('/equipo/deductions/overdue')
			await expect(page.getByRole('main')).toBeVisible()
			await expect(
				page
					.getByLabel('Breadcrumb', { exact: false })
					.getByRole('link', { name: 'Deducciones' }),
			).toBeVisible()
		})

		test('shows the overview cards section above the table', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions/overdue')
			const overview = page.locator('[data-testid="overdue-overview"]')
			const table = mainDataTable(page)
			await expect(overview).toBeVisible()
			await expect(table).toBeVisible()
			const { overviewTop, tableTop } = await page.evaluate(() => {
				const o = document.querySelector('[data-testid="overdue-overview"]')
				const mainEl = document.querySelector('main')
				const tables = mainEl?.querySelectorAll('table') ?? []
				const dataTable = tables[tables.length - 1] ?? null
				return {
					overviewTop: o?.getBoundingClientRect().top ?? 0,
					tableTop: dataTable?.getBoundingClientRect().top ?? 0,
				}
			})
			expect(overviewTop).toBeLessThan(tableTop)
		})

		test('shows the total overdue amount card with a weekly change badge', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions/overdue')
			const overview = page.locator('[data-testid="overdue-overview"]')
			await expect(
				overview.getByText(/monto total atrasado/i).first(),
			).toBeVisible()
			await expect(
				overview.getByText(/vs semana anterior/i).first(),
			).toBeVisible()
			await expect(
				overview.locator('[data-testid="change-badge"]').first(),
			).toBeVisible()
		})

		test('shows the total overdue credits card with a weekly change badge', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions/overdue')
			const overview = page.locator('[data-testid="overdue-overview"]')
			await expect(
				overview.getByText(/créditos atrasados/i).first(),
			).toBeVisible()
			await expect(
				overview.getByText(/vs semana anterior/i).first(),
			).toBeVisible()
		})

		test('shows the total overdue credits count as 2', async ({ page }) => {
			await page.goto('/equipo/deductions/overdue')
			await expect(
				page.locator('[data-testid="overdue-credits-value"]'),
			).toHaveText('2')
		})

		test('shows the oldest overdue age card', async ({ page }) => {
			await page.goto('/equipo/deductions/overdue')
			const overview = page.locator('[data-testid="overdue-overview"]')
			await expect(overview.getByText(/mayor atraso/i).first()).toBeVisible()
			await expect(overview.getByText(/día/i).first()).toBeVisible()
		})

		test('confirms a single overdue deduction and removes it from the list', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions/overdue')
			await expect(mainDataTable(page)).toBeVisible()
			await expect(
				page.getByText(seed.overdueApplicantName, { exact: true }).first(),
			).toBeVisible()
			const row = findTableRow(page, seed.overdueApplicantName)
			await row.scrollIntoViewIfNeeded()
			await row.getByRole('button', { name: /registrar/i }).click()
			await expect(mainDataTable(page)).toBeVisible()
			await expect(
				page.getByText(seed.overdueApplicantName, { exact: true }),
			).toHaveCount(0)
		})
	})

	test.describe('HR agent without company selected', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, hrAgentDeductions.email)
		})

		test('shows select a company empty state', async ({ page }) => {
			await page.goto('/equipo/deductions/overdue')
			await expect(
				page.getByRole('heading', { name: /selecciona una empresa/i }),
			).toBeVisible()
		})

		test('does not show a table', async ({ page }) => {
			await page.goto('/equipo/deductions/overdue')
			await expect(
				page.getByRole('heading', { name: /selecciona una empresa/i }),
			).toBeVisible()
			await expect(page.getByRole('main').getByRole('table')).toHaveCount(0)
		})

		test('does not show the overview cards', async ({ page }) => {
			await page.goto('/equipo/deductions/overdue')
			await expect(
				page.getByRole('heading', { name: /selecciona una empresa/i }),
			).toBeVisible()
			await expect(
				page.locator('[data-testid="overdue-overview"]'),
			).toHaveCount(0)
		})
	})

	test.describe('Non-HR agent cannot access overdue deductions', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, nonHrAgentDeductions.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('redirects to unauthorized', async ({ page }) => {
			await page.goto('/equipo/deductions/overdue')
			await expect(page).toHaveURL(/\/unauthorized/)
		})
	})
})

test.describe('HR overdue deductions — multiple overdue installments per credit', () => {
	let seed: SeedDeductionsQueueResult

	test.beforeEach(async () => {
		await cleanupDeductionsQueue()
		seed = await seedDeductionsQueue({
			withOverdue: true,
			withMultipleOverdue: true,
		})
	})

	test.beforeEach(async ({ page }) => {
		await loginPage(page, hrAgentDeductions.email)
		await setSelectedCompanyId(page, seed.companyId)
	})

	test.afterAll(async () => {
		await cleanupDeductionsQueue()
	})

	test('shows a confirm dialog when a credit has more than one overdue deduction', async ({
		page,
	}) => {
		const name = seed.multiOverdueApplicantName ?? ''
		await page.goto('/equipo/deductions/overdue')
		await expect(mainDataTable(page)).toBeVisible()
		const row = findTableRow(page, name)
		await row.getByRole('button', { name: /registrar/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		await expect(dialog.getByText(name).first()).toBeVisible()
		await expect(dialog.getByRole('checkbox')).toHaveCount(2)
	})

	test('confirms all overdue deductions from the dialog and removes the credit from the list', async ({
		page,
	}) => {
		const name = seed.multiOverdueApplicantName ?? ''
		await page.goto('/equipo/deductions/overdue')
		await expect(mainDataTable(page)).toBeVisible()
		const row = findTableRow(page, name)
		await row.getByRole('button', { name: /registrar/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		await expect(dialog.getByRole('checkbox')).toHaveCount(2)
		await dialog
			.getByRole('button', { name: /registrar seleccionadas/i })
			.click()
		await expect(page.getByRole('dialog')).toHaveCount(0)
		await expect(mainDataTable(page)).toBeVisible()
		await expect(page.getByText(name, { exact: true })).toHaveCount(0)
	})

	test('keeps the credit in the list when only one of multiple overdue deductions is confirmed', async ({
		page,
	}) => {
		const name = seed.multiOverdueApplicantName ?? ''
		await page.goto('/equipo/deductions/overdue')
		await expect(mainDataTable(page)).toBeVisible()
		const row = findTableRow(page, name)
		await row.getByRole('button', { name: /registrar/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const boxes = dialog.getByRole('checkbox')
		await expect(boxes).toHaveCount(2)
		await boxes.nth(1).click()
		await dialog
			.getByRole('button', { name: /registrar seleccionadas/i })
			.click()
		await expect(page.getByRole('dialog')).toHaveCount(0)
		await expect(mainDataTable(page)).toBeVisible()
		await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
	})
})
