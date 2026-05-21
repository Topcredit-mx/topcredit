import { expect, test } from '@playwright/test'
import type { SeedPaymentGracePeriodResult } from '~/e2e/server/tasks'
import {
	cleanupPaymentGracePeriod,
	seedPaymentGracePeriod,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import { installmentsAgentPaymentGrace } from './payment-grace-period.fixtures'

registerDbSpecGuards()

test.describe('Payment 15-day grace period (installments)', () => {
	let seed: SeedPaymentGracePeriodResult

	test.beforeAll(async () => {
		await cleanupPaymentGracePeriod()
		seed = await seedPaymentGracePeriod()
	})

	test.afterAll(async () => {
		await cleanupPaymentGracePeriod()
	})

	test.beforeEach(async ({ page }) => {
		await loginPage(page, installmentsAgentPaymentGrace.email)
		await setSelectedCompanyId(page, seed.companyId)
	})

	test('within-grace past-due installment stays on upcoming installments queue with grace badge', async ({
		page,
	}) => {
		await page.goto('/equipo/installments')
		await expect(mainDataTable(page)).toBeVisible()
		const graceRow = mainDataTable(page)
			.locator('tbody tr')
			.filter({ hasText: seed.installmentGraceApplicantName })
		await expect(graceRow.first()).toBeVisible()
		await expect(graceRow.getByText(/Instalación en gracia/i)).toBeVisible()
	})

	test('within-grace past-due installment is not listed on overdue installments', async ({
		page,
	}) => {
		await page.goto('/equipo/installments/overdue')
		await expect(mainDataTable(page)).toBeVisible()
		await expect(
			mainDataTable(page)
				.locator('tbody tr')
				.filter({ hasText: seed.installmentGraceApplicantName }),
		).toHaveCount(0)
	})

	test('installment more than 15 Mexico calendar days past due appears on overdue list', async ({
		page,
	}) => {
		await page.goto('/equipo/installments/overdue')
		await expect(mainDataTable(page)).toBeVisible()
		await expect(
			mainDataTable(page)
				.locator('tbody tr')
				.filter({ hasText: seed.installmentOverdueApplicantName })
				.first(),
		).toBeVisible()
	})
})
