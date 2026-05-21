import { expect, type Page, test } from '@playwright/test'
import type { SeedPaymentGracePeriodResult } from '~/e2e/server/tasks'
import {
	cleanupPaymentGracePeriod,
	seedPaymentGracePeriod,
} from '~/e2e/server/tasks'
import { applicantPaymentGraceWithin } from '../equipo/payment-grace-period.fixtures'
import { loginPage } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'

registerDbSpecGuards()

function paymentScheduleTable(page: Page) {
	return page
		.locator('[data-slot="card"]')
		.filter({
			has: page.getByRole('heading', { name: /calendario de pagos/i }),
		})
		.locator('table')
}

test.describe('Cuenta credit detail — 15-day grace period is invisible to applicants', () => {
	let seed: SeedPaymentGracePeriodResult

	test.beforeAll(async () => {
		await cleanupPaymentGracePeriod()
		seed = await seedPaymentGracePeriod()
	})

	test.afterAll(async () => {
		await cleanupPaymentGracePeriod()
	})

	test.beforeEach(async ({ page }) => {
		await loginPage(page, applicantPaymentGraceWithin.email)
	})

	test('within-grace past-due payment still shows Pendiente with no grace or overdue labels', async ({
		page,
	}) => {
		await page.goto(`/cuenta/credits/${seed.cuentaGraceWithinCreditId}`)
		await expect(
			page.getByRole('heading', { name: /detalle de tu crédito/i }),
		).toBeVisible()

		const table = paymentScheduleTable(page)
		await expect(table).toBeVisible()
		const row = table.locator('tbody tr').first()
		await expect(row.getByText(/pendiente/i)).toBeVisible()
		await expect(row.getByText(/en gracia/i)).toHaveCount(0)
		await expect(row.getByText(/atrasad/i)).toHaveCount(0)
		await expect(row.getByText(/15 días/i)).toHaveCount(0)
	})
})
