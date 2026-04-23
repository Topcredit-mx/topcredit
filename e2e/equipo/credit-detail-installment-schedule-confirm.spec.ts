import { expect, test } from '@playwright/test'
import type { SeedCreditDetailInstallmentScheduleResult } from '~/e2e/server/tasks'
import {
	cleanupCreditDetailInstallmentSchedule,
	seedCreditDetailInstallmentSchedule,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	creditDetailHrOnlyAgent,
	creditDetailInstallmentsAgent,
} from './credit-detail-installment-schedule.fixtures'

registerDbSpecGuards()

test.describe('Credit detail — confirm installment from schedule', () => {
	let seed: SeedCreditDetailInstallmentScheduleResult

	test.beforeAll(async () => {
		await cleanupCreditDetailInstallmentSchedule()
		seed = await seedCreditDetailInstallmentSchedule()
	})

	test.afterAll(async () => {
		await cleanupCreditDetailInstallmentSchedule()
	})

	test.describe('Installments agent with company selected', () => {
		test.beforeEach(async ({ page }) => {
			await page.clock.setFixedTime(new Date('2023-01-05T00:00:00'))
			await loginPage(page, creditDetailInstallmentsAgent.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('shows 5 schedule rows with buttons only for delayed and upcoming-period installments', async ({
			page,
		}) => {
			await page.goto(`/equipo/credits/${seed.creditId}`)
			await expect(
				page.getByRole('heading', { name: /detalle del crédito/i }),
			).toBeVisible()
			await expect(mainDataTable(page)).toBeVisible()
			await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(5)
			await expect(mainDataTable(page).locator('tbody tr button')).toHaveCount(
				2,
			)

			const r0 = mainDataTable(page).locator('tbody tr').nth(0)
			await expect(
				r0.getByRole('button', { name: /confirmar instalación/i }),
			).toHaveCount(0)

			const r1 = mainDataTable(page).locator('tbody tr').nth(1)
			await expect(r1.getByText(/atrasado/i).first()).toBeVisible()
			await expect(
				r1.getByRole('button', { name: /confirmar instalación/i }),
			).toBeVisible()

			const r2 = mainDataTable(page).locator('tbody tr').nth(2)
			await expect(r2.getByText(/pendiente/i).first()).toBeVisible()
			await expect(
				r2.getByRole('button', { name: /confirmar instalación/i }),
			).toBeVisible()

			const r3 = mainDataTable(page).locator('tbody tr').nth(3)
			await expect(
				r3.getByRole('button', { name: /confirmar instalación/i }),
			).toHaveCount(0)

			const r4 = mainDataTable(page).locator('tbody tr').nth(4)
			await expect(
				r4.getByRole('button', { name: /confirmar instalación/i }),
			).toHaveCount(0)
		})

		test('confirms installment on a delayed row, updates the badge, and removes the button', async ({
			page,
		}) => {
			await page.goto(`/equipo/credits/${seed.creditId}`)
			await expect(mainDataTable(page)).toBeVisible()
			const r1 = mainDataTable(page).locator('tbody tr').nth(1)
			await r1.getByRole('button', { name: /confirmar instalación/i }).click()
			const r1After = mainDataTable(page).locator('tbody tr').nth(1)
			await expect(
				r1After.getByRole('button', { name: /confirmar instalación/i }),
			).toHaveCount(0)
			await expect(r1After.getByText(/cobrado/i).first()).toBeVisible()
		})
	})

	test.describe('HR-only agent cannot confirm installment from credit detail', () => {
		test.beforeEach(async ({ page }) => {
			await page.clock.setFixedTime(new Date('2023-01-05T00:00:00'))
			await loginPage(page, creditDetailHrOnlyAgent.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('shows the schedule without a confirm installment button', async ({
			page,
		}) => {
			await page.goto(`/equipo/credits/${seed.creditId}`)
			await expect(mainDataTable(page)).toBeVisible()
			await expect(
				page.getByRole('button', { name: /confirmar instalación/i }),
			).toHaveCount(0)
		})
	})
})
