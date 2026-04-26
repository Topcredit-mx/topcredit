import { expect, type Page, test } from '@playwright/test'
import type {
	SeedInstallmentsQueueResult,
	SeedInstallmentsQueueTwentyPendingResult,
} from '~/e2e/server/tasks'
import {
	cleanupInstallmentsBulkQueue,
	cleanupInstallmentsQueue,
	seedInstallmentsQueue,
	seedInstallmentsQueueTwentyPending,
} from '~/e2e/server/tasks'
import {
	clearSelectedCompanyIdCookie,
	loginPage,
	setSelectedCompanyId,
} from '../helpers/auth'
import { mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	adminInstallmentsQueue,
	installmentAgentQueue,
	nonInstallmentsAgentQueue,
} from './installments-agents.fixtures'
import { installmentsBulkAgent } from './installments-bulk-queue.fixtures'

function installmentsQueueEmployeeLink(page: Page, displayName: string) {
	return page.getByRole('link', {
		name: new RegExp(
			`^${displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} - `,
		),
	})
}

registerDbSpecGuards()

test.describe('Installments queue', () => {
	let seed: SeedInstallmentsQueueResult

	test.beforeAll(async () => {
		await cleanupInstallmentsQueue()
		seed = await seedInstallmentsQueue()
	})

	test.afterAll(async () => {
		await cleanupInstallmentsQueue()
	})

	test.describe('Installments agent views installments queue', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, installmentAgentQueue.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('shows installments queue page with table', async ({ page }) => {
			await page.goto('/equipo/installments')
			await expect(page.getByRole('main')).toBeVisible()
			await expect(mainDataTable(page)).toBeVisible()
		})

		test('shows three installments overview cards above the queue table', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			await expect(
				page.getByRole('heading', { name: /resumen de instalaciones/i }),
			).toBeVisible()
			await expect(
				page.getByText(/total cobrado \(7 días\)/i).first(),
			).toBeVisible()
			await expect(
				page.getByText(/instalaciones cobradas \(7 días\)/i).first(),
			).toBeVisible()
			await expect(
				page
					.getByText(/antigüedad de la instalación pendiente más antigua/i)
					.first(),
			).toBeVisible()
			await expect(mainDataTable(page)).toBeVisible()
			const { headingBottom, tableTop } = await page.evaluate(() => {
				const h = [...document.querySelectorAll('h2')].find((el) =>
					/resumen de instalaciones/i.test(el.textContent || ''),
				)
				const mainEl = document.querySelector('main')
				const tables = mainEl?.querySelectorAll('table') ?? []
				const t = tables[tables.length - 1] ?? null
				return {
					headingBottom: h?.getBoundingClientRect().bottom ?? 0,
					tableTop: t?.getBoundingClientRect().top ?? 0,
				}
			})
			expect(headingBottom).toBeLessThanOrEqual(tableTop + 2)
		})

		test('shows weekly comparison labels on the collected amount and count cards', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			const overview = page.locator(
				'[aria-labelledby="installments-overview-heading"]',
			)
			await expect(overview).toBeVisible()
			await expect(overview.getByText(/vs semana anterior/i)).toHaveCount(2)
		})

		test('shows zero-day oldest pending when the queue uses future due dates', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			const card = page.locator(
				'[data-testid="installments-overview-oldest-pending"]',
			)
			await expect(card.getByText(/0 días/i).first()).toBeVisible()
		})

		test('shows employee, amount, progress, and unified workflow status column', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			await expect(mainDataTable(page)).toBeVisible()
			for (const label of [
				/empleado/i,
				/monto/i,
				/cuota/i,
				/^estado$/i,
			] as const) {
				const th = mainDataTable(page)
					.locator('thead th')
					.filter({ hasText: label })
				await th.first().scrollIntoViewIfNeeded()
				await expect(th.first()).toBeVisible()
			}
		})

		test('shows exactly one queue row per credit with a pending installment confirmation', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			await expect(mainDataTable(page)).toBeVisible()
			await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
				seed.expectedRowCount,
			)
		})

		test('shows next deduction date and company salary frequency above the table', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			const main = page.getByRole('main')
			await expect(main.getByText(/próxima deducción/i).first()).toBeVisible()
			await expect(main.getByText(/nómina/i).first()).toBeVisible()
			await expect(main.getByText(/mensual/i).first()).toBeVisible()
		})

		test('shows RH Pendiente when the front installment is still pending HR', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			const tr = page.locator('tr').filter({
				has: installmentsQueueEmployeeLink(page, seed.applicant1Name),
			})
			await expect(tr.first()).toContainText(/RH Pendiente/i)
		})

		test('allows selecting only rows where HR already confirmed the installment', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			const t1 = page.locator('tr').filter({
				has: installmentsQueueEmployeeLink(page, seed.applicant1Name),
			})
			await expect(
				t1.first().getByRole('checkbox', { name: /seleccionar fila/i }),
			).toBeDisabled()
			const t2 = page.locator('tr').filter({
				has: installmentsQueueEmployeeLink(page, seed.applicant2Name),
			})
			await t2.first().scrollIntoViewIfNeeded()
			await expect(
				t2.first().getByRole('checkbox', { name: /seleccionar fila/i }),
			).toBeEnabled()
		})

		test('shows both applicant names in the table', async ({ page }) => {
			await page.goto('/equipo/installments')
			await expect(mainDataTable(page)).toBeVisible()
			await expect(
				installmentsQueueEmployeeLink(page, seed.applicant1Name).first(),
			).toBeVisible()
			await expect(
				installmentsQueueEmployeeLink(page, seed.applicant2Name).first(),
			).toBeVisible()
		})

		test('shows export CSV button and downloads pending installment rows', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			await expect(mainDataTable(page)).toBeVisible()
			await page.getByRole('button', { name: /exportar csv/i }).click()
			await expect(
				page.getByText(/archivo csv descargado/i).first(),
			).toBeVisible()
		})

		test('disables the row checkbox while the installment is awaiting HR confirmation', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			await expect(mainDataTable(page)).toBeVisible()
			const t1 = page.locator('tr').filter({
				has: installmentsQueueEmployeeLink(page, seed.applicant1Name),
			})
			await t1.first().scrollIntoViewIfNeeded()
			await expect(t1.first().locator('button[role="checkbox"]')).toBeDisabled()
		})

		test('bulk-confirms installments for multiple eligible rows in one action', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			await expect(mainDataTable(page)).toBeVisible()
			await expect(
				page.locator(
					'[aria-labelledby="installments-history-preview-heading"] ol li',
				),
			).toHaveCount(2)
			const tr2 = page.locator('tr', { hasText: 'INST002' })
			await tr2.first().scrollIntoViewIfNeeded()
			await tr2
				.first()
				.locator('button[role="checkbox"]')
				.click({ force: true })
			const tr3 = page.locator('tr', { hasText: 'INST003' })
			await tr3.first().scrollIntoViewIfNeeded()
			await tr3
				.first()
				.locator('button[role="checkbox"]')
				.click({ force: true })
			await page
				.getByRole('button', { name: /confirmar 2 instalaciones/i })
				.click()
			await expect(
				page.getByText(/2 instalaciones confirmadas/i).first(),
			).toBeVisible()
			// Other credits’ next installments are due after the current pay period.
			await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(1)
			await expect(
				installmentsQueueEmployeeLink(page, seed.applicant1Name).first(),
			).toBeVisible()
			await expect(
				page.locator(
					'[aria-labelledby="installments-history-preview-heading"] ol li',
				),
			).toHaveCount(4)
		})
	})

	test.describe('Installments agent with no company selected', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, installmentAgentQueue.email)
			await clearSelectedCompanyIdCookie(page)
		})

		test('shows select-a-company empty state instead of table', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			await expect(page.getByRole('main')).toBeVisible()
			await expect(
				page.getByText(/selecciona una empresa/i).first(),
			).toBeVisible()
			await expect(page.getByRole('main').getByRole('table')).toHaveCount(0)
		})
	})

	test.describe('Admin with no company selected', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, adminInstallmentsQueue.email)
			await clearSelectedCompanyIdCookie(page)
		})

		test('shows select-a-company empty state instead of table', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			await expect(page.getByRole('main')).toBeVisible()
			await expect(
				page.getByText(/selecciona una empresa/i).first(),
			).toBeVisible()
			await expect(page.getByRole('main').getByRole('table')).toHaveCount(0)
		})
	})

	test.describe('Twenty pending installments (bulk queue seed)', () => {
		let bulkSeed: SeedInstallmentsQueueTwentyPendingResult

		test.beforeAll(async () => {
			await cleanupInstallmentsBulkQueue()
			bulkSeed = await seedInstallmentsQueueTwentyPending()
		})

		test.afterAll(async () => {
			await cleanupInstallmentsBulkQueue()
		})

		test.beforeEach(async ({ page }) => {
			await loginPage(page, installmentsBulkAgent.email)
			await setSelectedCompanyId(page, bulkSeed.companyId)
		})

		test('selects all rows, confirms every installment, preview shows 10 and full history holds 20 across pages', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			await expect(mainDataTable(page)).toBeVisible()
			await page.locator('#data-table-page-size').click()
			await page.getByRole('option', { name: '25' }).click()
			await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
				bulkSeed.expectedQueueRowCount,
			)
			await page
				.locator('button[aria-label="Seleccionar todas las filas elegibles"]')
				.click()
			await page
				.getByRole('button', { name: /confirmar 20 instalaciones/i })
				.click()
			const settleDialog = page.getByRole('alertdialog')
			await expect(settleDialog).toBeVisible()
			await settleDialog.getByRole('button', { name: /^Confirmar$/i }).click()
			await expect(
				page.getByText(/20 instalaciones confirmadas/i).first(),
			).toBeVisible()
			await expect(
				page.locator(
					'[aria-labelledby="installments-history-preview-heading"] ol li',
				),
			).toHaveCount(10)
			await page.goto('/equipo/installments/history')
			await expect(
				page.getByText(/0 de 20 filas seleccionadas/i).first(),
			).toBeVisible()
			await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(10)
			await expect(page.getByText(/página 1 de 2/i).first()).toBeVisible()
			await page.getByTitle('Ir a la página siguiente').click()
			await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(10)
		})
	})

	test.describe('Agent without installments role cannot access installments queue', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, nonInstallmentsAgentQueue.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('redirects to unauthorized when accessing installments queue', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			await expect(page).toHaveURL(/\/unauthorized/)
		})
	})
})
