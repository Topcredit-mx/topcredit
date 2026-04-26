import { expect, type Page, test } from '@playwright/test'
import type { SeedDeductionsQueueResult } from '~/e2e/server/tasks'
import { cleanupDeductionsQueue, seedDeductionsQueue } from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { sumAmountStringsMxnE2e } from '../helpers/currency'
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

		test('shows total, count, and oldest-overdue columns like installments overdue', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions/overdue')
			await expect(mainDataTable(page)).toBeVisible()
			for (const label of [
				/total atrasado/i,
				/cuotas atrasadas/i,
				/atraso más antiguo/i,
			]) {
				const th = mainDataTable(page)
					.locator('thead th')
					.filter({ hasText: label })
				await expect(th.first()).toBeVisible()
			}
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

		test('shows the total overdue amount card with a previous-deduction change badge', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions/overdue')
			const overview = page.locator('[data-testid="overdue-overview"]')
			await expect(
				overview.getByText(/monto total atrasado/i).first(),
			).toBeVisible()
			await expect(
				overview.getByText(/vs deducción anterior/i).first(),
			).toBeVisible()
			await expect(
				overview.locator('[data-testid="change-badge"]').first(),
			).toBeVisible()
		})

		test('shows the total overdue credits card with a previous-deduction change badge', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions/overdue')
			const overview = page.locator('[data-testid="overdue-overview"]')
			await expect(
				overview.getByText(/créditos atrasados/i).first(),
			).toBeVisible()
			await expect(
				overview.getByText(/vs deducción anterior/i).first(),
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

		test('shows nómina line with selected payment total that tracks row checkboxes', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions/overdue')
			const main = page.getByRole('main')
			await expect(main.getByText(/^nómina:/i).first()).toBeVisible()
			const status = page.getByRole('status', { name: /selección:/i })
			await expect(status).toContainText(/sin selección/i)
			const totals = seed.overdueDeductionsRowTotals
			if (totals === undefined) {
				throw new Error('seed missing overdueDeductionsRowTotals')
			}
			const [t0, t1] = totals
			const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
			const row0 = mainDataTable(page).locator('tbody tr').nth(0)
			const row1 = mainDataTable(page).locator('tbody tr').nth(1)
			await row0.scrollIntoViewIfNeeded()
			await row0.getByRole('checkbox', { name: /seleccionar fila/i }).click()
			await expect(status).toHaveAttribute(
				'aria-label',
				new RegExp(
					`Selección: total ${escapeRe(sumAmountStringsMxnE2e([t0]))}`,
				),
			)
			await row1.getByRole('checkbox', { name: /seleccionar fila/i }).click()
			await expect(status).toHaveAttribute(
				'aria-label',
				new RegExp(
					`Selección: total ${escapeRe(sumAmountStringsMxnE2e([t0, t1]))}`,
				),
			)
			await row0.getByRole('checkbox', { name: /seleccionar fila/i }).click()
			await expect(status).toHaveAttribute(
				'aria-label',
				new RegExp(
					`Selección: total ${escapeRe(sumAmountStringsMxnE2e([t1]))}`,
				),
			)
			await row1.getByRole('checkbox', { name: /seleccionar fila/i }).click()
			await expect(status).toContainText(/sin selección/i)
		})

		test('bulk-confirms a single-credit row and removes it from the list', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions/overdue')
			await expect(mainDataTable(page)).toBeVisible()
			await expect(
				page.getByText(seed.overdueApplicantName, { exact: true }).first(),
			).toBeVisible()
			const row = findTableRow(page, seed.overdueApplicantName)
			await row.scrollIntoViewIfNeeded()
			await row.getByRole('checkbox', { name: /seleccionar fila/i }).click()
			await page.getByRole('button', { name: /confirmar 1 deducción/i }).click()
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

	test('aggregates three overdue payments into one table row with count 3', async ({
		page,
	}) => {
		const name = seed.multiOverdueApplicantName ?? ''
		await page.goto('/equipo/deductions/overdue')
		await expect(mainDataTable(page)).toBeVisible()
		const row = findTableRow(page, name)
		await expect(row.getByText('3', { exact: true }).first()).toBeVisible()
	})

	test('bulk pick dialog disables confirm and shows a tooltip when the selection skips a due date', async ({
		page,
	}) => {
		const name = seed.multiOverdueApplicantName ?? ''
		await page.goto('/equipo/deductions/overdue')
		await expect(mainDataTable(page)).toBeVisible()
		const row = findTableRow(page, name)
		await row.scrollIntoViewIfNeeded()
		await row.getByRole('checkbox', { name: /seleccionar fila/i }).click()
		await page
			.getByRole('button', { name: /confirmar 3 deducciones/i })
			.first()
			.click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const checkboxes = dialog.getByRole('checkbox', {
			name: /pago \d+/i,
		})
		await expect(checkboxes).toHaveCount(3)
		await checkboxes.nth(1).click()
		const confirm = dialog.getByRole('button', {
			name: /confirmar 2 deducciones/i,
		})
		await expect(confirm).toBeDisabled()
		await confirm.locator('..').hover()
		await expect(
			page.getByText(/no puedes omitir una cuota intermedia/i),
		).toBeVisible()
		await expect(checkboxes.nth(0)).toBeChecked()
		await expect(checkboxes.nth(1)).not.toBeChecked()
		await expect(checkboxes.nth(2)).toBeChecked()
	})

	test('bulk-confirms the two oldest overdue payments when the newest is unchecked in the pick dialog', async ({
		page,
	}) => {
		const name = seed.multiOverdueApplicantName ?? ''
		await page.goto('/equipo/deductions/overdue')
		await expect(mainDataTable(page)).toBeVisible()
		const row = findTableRow(page, name)
		await row.scrollIntoViewIfNeeded()
		await row.getByRole('checkbox', { name: /seleccionar fila/i }).click()
		await page
			.getByRole('button', { name: /confirmar 3 deducciones/i })
			.first()
			.click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const checkboxes = dialog.getByRole('checkbox', {
			name: /pago \d+/i,
		})
		await checkboxes.nth(2).click()
		await dialog
			.getByRole('button', { name: /confirmar 2 deducciones/i })
			.click()
		await expect(page.getByRole('dialog')).toHaveCount(0)
		await expect(mainDataTable(page)).toBeVisible()
		const rowAfter = findTableRow(page, name)
		await expect(rowAfter.getByText('1', { exact: true }).first()).toBeVisible()
	})
})

test.describe('HR agent sidebar overdue deductions badge', () => {
	let seed: SeedDeductionsQueueResult

	test.beforeEach(async () => {
		await cleanupDeductionsQueue()
		seed = await seedDeductionsQueue({
			withOverdue: true,
			withMultipleOverdue: true,
		})
	})

	test.afterAll(async () => {
		await cleanupDeductionsQueue()
	})

	function mainNav(page: Page) {
		return page.getByRole('navigation', { name: 'Navegación' })
	}

	async function openDeductionsSubNav(page: Page) {
		const nav = mainNav(page)
		await nav.getByRole('button', { name: 'Deducciones' }).click()
	}

	test.beforeEach(async ({ page }) => {
		await loginPage(page, hrAgentDeductions.email)
		await setSelectedCompanyId(page, seed.companyId)
		await page.goto('/equipo')
		await expect(mainNav(page)).toBeVisible()
	})

	test('shows the total overdue payment count on Retrasos, not one per credit', async ({
		page,
	}) => {
		await openDeductionsSubNav(page)
		const retrasos = mainNav(page).getByRole('link', { name: /Retrasos/i })
		await expect(retrasos).toBeVisible()
		await expect(retrasos).toHaveAttribute('href', '/equipo/deductions/overdue')
		await expect(retrasos.getByText('5', { exact: true })).toBeVisible()
	})

	test('updates the Retrasos badge after confirming overdue payments', async ({
		page,
	}) => {
		await openDeductionsSubNav(page)
		await expect(
			mainNav(page)
				.getByRole('link', { name: /Retrasos/i })
				.getByText('5', { exact: true }),
		).toBeVisible()

		const name = seed.multiOverdueApplicantName ?? ''
		await page.goto('/equipo/deductions/overdue')
		await expect(mainDataTable(page)).toBeVisible()
		const row = findTableRow(page, name)
		await row.scrollIntoViewIfNeeded()
		await row.getByRole('checkbox', { name: /seleccionar fila/i }).click()
		await page
			.getByRole('button', { name: /confirmar 3 deducciones/i })
			.first()
			.click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const checkboxes = dialog.getByRole('checkbox', {
			name: /pago \d+/i,
		})
		await checkboxes.nth(2).click()
		await dialog
			.getByRole('button', { name: /confirmar 2 deducciones/i })
			.click()
		await expect(page.getByRole('dialog')).toHaveCount(0)

		await page.goto('/equipo')
		await openDeductionsSubNav(page)
		await expect(
			mainNav(page)
				.getByRole('link', { name: /Retrasos/i })
				.getByText('3', { exact: true }),
		).toBeVisible()
	})
})
