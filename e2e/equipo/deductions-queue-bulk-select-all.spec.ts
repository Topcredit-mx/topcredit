import { expect, test } from '@playwright/test'
import type { SeedDeductionsQueueResult } from '~/e2e/server/tasks'
import {
	cleanupDeductionsQueue,
	seedActiveQueueBulkConfirmJob,
	seedDeductionsQueue,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import { hrAgentDeductions } from './deductions-queue.fixtures'

registerDbSpecGuards()

test.describe('HR deductions queue select all filtered', () => {
	let seed: SeedDeductionsQueueResult

	test.beforeEach(async ({ page }) => {
		await cleanupDeductionsQueue()
		seed = await seedDeductionsQueue({ manyUpcomingCount: 10 })
		await loginPage(page, hrAgentDeductions.email)
		await setSelectedCompanyId(page, seed.companyId)
	})

	test.afterEach(async () => {
		await cleanupDeductionsQueue()
	})

	test('offers select-all across pages and confirms via background job', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions')
		const table = mainDataTable(page)
		await expect(table).toBeVisible()
		await expect(table.locator('tbody tr')).toHaveCount(10)

		await table.locator('thead').getByRole('checkbox').click({ force: true })

		const selectAllLink = table.getByRole('button', {
			name: new RegExp(`seleccionar las ${seed.expectedRowCount} filas`, 'i'),
		})
		await expect(selectAllLink).toBeVisible()

		await selectAllLink.click()

		await expect(
			table.getByText(
				new RegExp(
					`se seleccionaron las ${seed.expectedRowCount} filas de la cola`,
					'i',
				),
			),
		).toBeVisible()

		await page
			.getByRole('button', {
				name: new RegExp(`confirmar ${seed.expectedRowCount} deducc`, 'i'),
			})
			.click()

		await expect(
			page
				.getByText(
					/preparando confirmación en segundo plano|confirmando \d+ de \d+/i,
				)
				.first(),
		).toBeVisible()

		await expect(
			page.getByText(/no hay deducciones pendientes/i).first(),
		).toBeVisible({ timeout: 30_000 })
	})

	test('does not show select-all row when rows are selected individually', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions')
		const table = mainDataTable(page)
		await expect(table).toBeVisible()

		for (let i = 0; i < 10; i += 1) {
			const row = table.locator('tbody tr').nth(i)
			await row.scrollIntoViewIfNeeded()
			await row.getByRole('checkbox').click({ force: true })
		}

		await expect(
			table.getByRole('button', {
				name: new RegExp(`seleccionar las ${seed.expectedRowCount} filas`, 'i'),
			}),
		).toHaveCount(0)
	})

	test('restores bulk confirm progress after page reload', async ({ page }) => {
		await seedActiveQueueBulkConfirmJob({
			userEmail: hrAgentDeductions.email,
			kind: 'hr_deductions',
			totalCount: 10,
			processedCount: 2,
			status: 'running',
		})

		await page.goto('/equipo/deductions')
		const table = mainDataTable(page)
		await expect(table).toBeVisible()

		await expect(page.getByText(/confirmando 2 de 10/i).first()).toBeVisible()

		await page.reload()

		await expect(table).toBeVisible()
		await expect(page.getByText(/confirmando 2 de 10/i).first()).toBeVisible()
	})
})
