import { expect, test } from '@playwright/test'
import type { SeedCreditFinalInstallmentSettlesResult } from '~/e2e/server/tasks'
import {
	cleanupCreditFinalInstallmentSettles,
	seedCreditFinalInstallmentSettles,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import { creditFinalInstallmentSettleInstallmentsAgent } from './credit-final-installment-settles.fixtures'

registerDbSpecGuards()

test.describe('Credit auto-settles when last installment is confirmed', () => {
	let seed: SeedCreditFinalInstallmentSettlesResult

	test.beforeAll(async () => {
		await cleanupCreditFinalInstallmentSettles()
		seed = await seedCreditFinalInstallmentSettles()
	})

	test.afterAll(async () => {
		await cleanupCreditFinalInstallmentSettles()
	})

	test.beforeEach(async ({ page }) => {
		await loginPage(page, creditFinalInstallmentSettleInstallmentsAgent.email)
		await setSelectedCompanyId(page, seed.companyId)
	})

	test('confirming the final installment sets credit status to Liquidado', async ({
		page,
	}) => {
		await page.goto(`/equipo/credits/${seed.creditId}`)
		await expect(
			page.getByRole('heading', { name: /detalle del crédito/i }),
		).toBeVisible()

		const main = page.getByRole('main')
		await expect(main.getByText(/^Dispersado$/i)).toBeVisible()

		const table = mainDataTable(page)
		await expect(table.locator('tbody tr')).toHaveCount(3)

		const lastRow = table.locator('tbody tr').nth(seed.lastScheduleRowIndex)
		await expect(
			lastRow.getByRole('button', { name: /confirmar instalación/i }),
		).toBeVisible()

		await lastRow
			.getByRole('button', { name: /confirmar instalación/i })
			.click()

		const dialog = page.getByRole('alertdialog')
		await expect(dialog).toBeVisible()
		await expect(
			dialog.getByRole('heading', { name: /confirmar última instalación/i }),
		).toBeVisible()
		await expect(dialog.locator('tbody tr')).toHaveCount(1)

		await dialog.getByRole('button', { name: /^Confirmar$/i }).click()

		const lastRowAfter = table
			.locator('tbody tr')
			.nth(seed.lastScheduleRowIndex)
		await expect(
			lastRowAfter.getByRole('button', { name: /confirmar instalación/i }),
		).toHaveCount(0)
		await expect(
			lastRowAfter.getByText(/deducción confirmada/i).first(),
		).toBeVisible()
		await expect(
			lastRowAfter.getByText(/instalación confirmada/i).first(),
		).toBeVisible()

		await expect(main.getByText(/^Liquidado$/i)).toBeVisible({
			timeout: 15_000,
		})
		await expect(main.getByText(/^Dispersado$/i)).toHaveCount(0)
	})
})
