import { expect, test } from '@playwright/test'
import type {
	SeedCreditFinalInstallmentSettlesResult,
	SeedInstallmentsQueueMixedSettlementAndPartialResult,
} from '~/e2e/server/tasks'
import {
	cleanupCreditFinalInstallmentSettles,
	seedCreditFinalInstallmentSettles,
	seedInstallmentsQueueMixedSettlementAndPartial,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	creditFinalInstallmentSettleApplicant,
	creditFinalInstallmentSettleInstallmentsAgent,
	creditPartialScheduleApplicant,
} from './credit-final-installment-settles.fixtures'

registerDbSpecGuards()

test.describe('Installments queue — final installment via bulk only', () => {
	let seed: SeedCreditFinalInstallmentSettlesResult

	test.afterAll(async () => {
		await cleanupCreditFinalInstallmentSettles()
	})

	test.beforeEach(async ({ page }) => {
		await cleanupCreditFinalInstallmentSettles()
		seed = await seedCreditFinalInstallmentSettles()
		await loginPage(page, creditFinalInstallmentSettleInstallmentsAgent.email)
		await setSelectedCompanyId(page, seed.companyId)
	})

	test('bulk confirm shows settlement preview then removes queue row', async ({
		page,
	}) => {
		await page.goto('/equipo/installments')
		await expect(
			page.getByRole('heading', { name: /instalaciones/i }).first(),
		).toBeVisible()

		const table = mainDataTable(page)
		const row = table.locator('tbody tr').filter({
			hasText: creditFinalInstallmentSettleApplicant.name,
		})
		await expect(row).toBeVisible()
		await expect(row.getByText('3 de 3')).toBeVisible()

		await row.getByRole('checkbox', { name: /seleccionar fila/i }).click()

		await page.getByRole('button', { name: /confirmar 1 instalación/i }).click()

		const dialog = page.getByRole('alertdialog')
		await expect(dialog).toBeVisible()
		await expect(
			dialog.getByRole('heading', {
				name: /confirmar instalaciones seleccionadas/i,
			}),
		).toBeVisible()
		await expect(
			dialog.getByText(/1 de 1 créditos van a liquidarse/i),
		).toBeVisible()
		await expect(dialog.locator('tbody tr')).toHaveCount(1)
		await expect(
			dialog.getByText(creditFinalInstallmentSettleApplicant.name),
		).toBeVisible()

		await dialog.getByRole('button', { name: /^Confirmar$/i }).click()

		await expect(
			table.locator('tbody tr').filter({
				hasText: creditFinalInstallmentSettleApplicant.name,
			}),
		).toHaveCount(0)
	})
})

test.describe('Installments queue — bulk mix: settle one credit + confirm mid-schedule', () => {
	let seed: SeedInstallmentsQueueMixedSettlementAndPartialResult

	test.afterAll(async () => {
		await cleanupCreditFinalInstallmentSettles()
	})

	test.beforeEach(async ({ page }) => {
		await cleanupCreditFinalInstallmentSettles()
		seed = await seedInstallmentsQueueMixedSettlementAndPartial()
		await loginPage(page, creditFinalInstallmentSettleInstallmentsAgent.email)
		await setSelectedCompanyId(page, seed.companyId)
	})

	test('bulk dialog lists only credits that will liquidate, summary counts selection', async ({
		page,
	}) => {
		await page.goto('/equipo/installments')
		await expect(
			page.getByRole('heading', { name: /instalaciones/i }).first(),
		).toBeVisible()

		const table = mainDataTable(page)
		await expect(table.locator('tbody tr')).toHaveCount(2)

		const rowFinal = table.locator('tbody tr').filter({
			hasText: creditFinalInstallmentSettleApplicant.name,
		})
		const rowPartial = table.locator('tbody tr').filter({
			hasText: creditPartialScheduleApplicant.name,
		})
		await expect(rowFinal.getByText('3 de 3')).toBeVisible()
		await expect(rowPartial.getByText('2 de 3')).toBeVisible()

		await page
			.getByRole('checkbox', { name: /seleccionar todas las filas elegibles/i })
			.click()

		await page
			.getByRole('button', { name: /confirmar 2 instalaciones/i })
			.click()

		const dialog = page.getByRole('alertdialog')
		await expect(dialog).toBeVisible()
		await expect(
			dialog.getByText(/1 de 2 créditos van a liquidarse/i),
		).toBeVisible()
		await expect(dialog.locator('tbody tr')).toHaveCount(1)
		await expect(
			dialog.getByText(creditFinalInstallmentSettleApplicant.name),
		).toBeVisible()
		await expect(
			dialog.getByText(creditPartialScheduleApplicant.name),
		).toHaveCount(0)

		await dialog.getByRole('button', { name: /^Confirmar$/i }).click()

		await expect(
			page.getByText(/no hay instalaciones pendientes/i),
		).toBeVisible()
		await expect(page.getByRole('main').getByRole('table')).toHaveCount(0)
	})

	test('bulk confirm with no settling credits does not open dialog', async ({
		page,
	}) => {
		await page.goto('/equipo/installments')

		const table = mainDataTable(page)
		const rowPartial = table.locator('tbody tr').filter({
			hasText: creditPartialScheduleApplicant.name,
		})
		await expect(rowPartial).toBeVisible()

		await rowPartial
			.getByRole('checkbox', { name: /seleccionar fila/i })
			.click()
		await page.getByRole('button', { name: /confirmar 1 instalación/i }).click()

		await expect(page.getByRole('alertdialog')).toHaveCount(0)

		await expect(table.locator('tbody tr')).toHaveCount(1)
		await expect(
			table.locator('tbody tr').filter({
				hasText: creditFinalInstallmentSettleApplicant.name,
			}),
		).toBeVisible()
		await expect(
			table.getByText(creditPartialScheduleApplicant.name),
		).toHaveCount(0)
	})
})
