import { expect, test } from '@playwright/test'
import type { SeedPaymentGracePeriodResult } from '~/e2e/server/tasks'
import {
	cleanupPaymentGracePeriod,
	seedPaymentGracePeriod,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import { hrAgentPaymentGrace } from './payment-grace-period.fixtures'

registerDbSpecGuards()

test.describe('Payment 15-day grace period (deductions)', () => {
	let seed: SeedPaymentGracePeriodResult

	test.beforeAll(async () => {
		await cleanupPaymentGracePeriod()
		seed = await seedPaymentGracePeriod()
	})

	test.afterAll(async () => {
		await cleanupPaymentGracePeriod()
	})

	test.beforeEach(async ({ page }) => {
		await page.clock.setFixedTime(new Date('2023-01-05T00:00:00'))
		await loginPage(page, hrAgentPaymentGrace.email)
		await setSelectedCompanyId(page, seed.companyId)
	})

	test('within-grace past-due payment stays on upcoming deductions queue with grace badge', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions')
		await expect(mainDataTable(page)).toBeVisible()
		await expect(
			page.getByText(seed.graceApplicantName, { exact: true }).first(),
		).toBeVisible()
		const graceRow = mainDataTable(page)
			.locator('tbody tr')
			.filter({ hasText: seed.graceApplicantName })
		await expect(graceRow.getByText(/Deducción en gracia/i)).toBeVisible()
	})

	test('within-grace past-due payment is not listed on overdue deductions', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions/overdue')
		await expect(mainDataTable(page)).toBeVisible()
		await expect(
			page.getByText(seed.graceApplicantName, { exact: true }),
		).toHaveCount(0)
	})

	test('payment more than 15 Mexico calendar days past due appears on overdue list', async ({
		page,
	}) => {
		await page.goto('/equipo/deductions/overdue')
		await expect(mainDataTable(page)).toBeVisible()
		await expect(
			page.getByText(seed.overdueApplicantName, { exact: true }).first(),
		).toBeVisible()
	})
})
