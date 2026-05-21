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

test.describe('Payment 15-day grace period (credit detail schedule)', () => {
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

	test('shows Deducción en gracia with 15-day grace subline on an unconfirmed within-grace row', async ({
		page,
	}) => {
		await page.goto(
			`/equipo/credits/${seed.creditDetailDeductionGraceCreditId}`,
		)
		const table = mainDataTable(page)
		await expect(table).toBeVisible()
		const row = table.locator('tbody tr').nth(seed.creditDetailGraceRowIndex)
		const deductionCell = row.locator('td').nth(5)
		await expect(deductionCell.getByText(/Deducción en gracia/i)).toBeVisible()
		await expect(
			deductionCell.getByText(/periodo de gracia: 15 días/i),
		).toBeVisible()
		const scheduledDateCell = row.locator('td').nth(1)
		await expect(
			scheduledDateCell.getByText('31 dic 2022', { exact: true }),
		).toBeVisible()
	})

	test('shows Instalación en gracia with 15-day grace subline on an RH-confirmed within-grace row', async ({
		page,
	}) => {
		await page.goto(
			`/equipo/credits/${seed.creditDetailInstallmentGraceCreditId}`,
		)
		const table = mainDataTable(page)
		await expect(table).toBeVisible()
		const row = table.locator('tbody tr').nth(seed.creditDetailGraceRowIndex)
		const installmentCell = row.locator('td').nth(6)
		await expect(
			installmentCell.getByText(/Instalación en gracia/i),
		).toBeVisible()
		await expect(
			installmentCell.getByText(/periodo de gracia: 15 días/i),
		).toBeVisible()
		const scheduledDateCell = row.locator('td').nth(1)
		await expect(
			scheduledDateCell.getByText('31 dic 2022', { exact: true }),
		).toBeVisible()
	})
})
