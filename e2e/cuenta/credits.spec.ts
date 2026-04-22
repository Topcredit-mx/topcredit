import { expect, test } from '@playwright/test'
import type { SeedCuentaCreditsResult } from '~/e2e/server/tasks'
import {
	cleanupCuentaCredits,
	seedCuentaCredits,
	seedCuentaCreditsEmpty,
} from '~/e2e/server/tasks'
import { loginPage } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import { creditsApplicant, creditsOtherApplicant } from './credits.fixtures'

registerDbSpecGuards()

test.describe('Applicant views active credits', () => {
	let seedResult: SeedCuentaCreditsResult

	test.beforeAll(async () => {
		await cleanupCuentaCredits()
		seedResult = await seedCuentaCredits()
	})

	test.afterAll(async () => {
		await cleanupCuentaCredits()
	})

	test.beforeEach(async ({ page }) => {
		await loginPage(page, creditsApplicant.email)
	})

	test('shows disbursed credit with amount and status on credits page', async ({
		page,
	}) => {
		await page.goto('/cuenta/credits')
		await expect(
			page.getByRole('heading', { name: /mis créditos/i }),
		).toBeVisible()
		await expect(page.getByText('$50,000.00')).toBeVisible()
		await expect(page.getByText(/dispersado/i)).toBeVisible()
	})

	test('shows credit detail with amount, term, rate, and dates', async ({
		page,
	}) => {
		await page.goto('/cuenta/credits')
		await expect(
			page.getByRole('heading', { name: /mis créditos/i }),
		).toBeVisible()

		const detailLink = page.locator(
			`a[href="/cuenta/credits/${seedResult.creditId}"]`,
		)
		await detailLink.scrollIntoViewIfNeeded()
		await expect(detailLink).toBeVisible()

		await page.goto(`/cuenta/credits/${seedResult.creditId}`)
		const h1 = page.getByRole('heading', { name: /detalle de tu crédito/i })
		await h1.scrollIntoViewIfNeeded()
		await expect(h1).toBeVisible()

		await expect(page.getByText('$50,000.00')).toBeVisible()
		await expect(page.getByText('12 meses')).toBeVisible()
		await expect(page.getByText('2.50%')).toBeVisible()
		await expect(page.getByText(/dispersado/i)).toBeVisible()
		await expect(page.getByText(/calendario de pagos/i)).toBeVisible()
	})

	test('shows 404 for non-existent credit', async ({ page }) => {
		const res = await page.goto('/cuenta/credits/999999')
		expect(res?.status()).toBeGreaterThanOrEqual(400)
		await expect(
			page.getByText(/404|not found|página no encontrada|could not be found/i),
		).toBeVisible()
	})

	test('applicant cannot open another applicant credit by id', async ({
		page,
	}) => {
		await loginPage(page, creditsOtherApplicant.email)
		const res = await page.goto(`/cuenta/credits/${seedResult.creditId}`)
		expect(res?.status()).toBeGreaterThanOrEqual(400)
		await expect(
			page.getByText(/404|not found|página no encontrada|could not be found/i),
		).toBeVisible()
	})

	test('shows payment schedule table with correct installment count', async ({
		page,
	}) => {
		await page.goto(`/cuenta/credits/${seedResult.creditId}`)
		await expect(
			page.getByRole('heading', { name: /detalle de tu crédito/i }),
		).toBeVisible()
		const scheduleCard = page.locator('[data-slot="card"]').filter({
			has: page.getByRole('heading', { name: /calendario de pagos/i }),
		})
		const table = scheduleCard.locator('table')
		await expect(table).toBeVisible()
		await expect(table.locator('tbody tr')).toHaveCount(12)
	})

	test('shows correct payment amounts in schedule', async ({ page }) => {
		await page.goto(`/cuenta/credits/${seedResult.creditId}`)
		await expect(
			page.getByRole('heading', { name: /detalle de tu crédito/i }),
		).toBeVisible()
		const scheduleCard = page.locator('[data-slot="card"]').filter({
			has: page.getByRole('heading', { name: /calendario de pagos/i }),
		})
		const table = scheduleCard.locator('table')
		await expect(table.locator('tbody tr')).toHaveCount(12)
		const firstRow = table.locator('tbody tr').first()
		await firstRow.scrollIntoViewIfNeeded()
		await expect(firstRow.getByText('$4,287.50')).toBeVisible()
	})

	test('shows due date and status columns in payment schedule', async ({
		page,
	}) => {
		await page.goto(`/cuenta/credits/${seedResult.creditId}`)
		await expect(
			page.getByRole('heading', { name: /detalle de tu crédito/i }),
		).toBeVisible()
		const scheduleCard = page.locator('[data-slot="card"]').filter({
			has: page.getByRole('heading', { name: /calendario de pagos/i }),
		})
		const table = scheduleCard.locator('table')
		await expect(
			table.locator('th', { hasText: /fecha de pago/i }),
		).toBeVisible()
		await expect(table.locator('th', { hasText: /estado/i })).toBeVisible()
	})

	test('shows confirmed payment as Confirmado to the applicant', async ({
		page,
	}) => {
		await page.goto(`/cuenta/credits/${seedResult.creditId}`)
		const scheduleCard = page.locator('[data-slot="card"]').filter({
			has: page.getByRole('heading', { name: /calendario de pagos/i }),
		})
		const table = scheduleCard.locator('table')
		const row = table
			.locator('tbody tr')
			.nth(seedResult.confirmedPaymentRowIndex)
		await row.scrollIntoViewIfNeeded()
		await expect(row.getByText(/confirmado/i)).toBeVisible()
	})

	test('shows pending payment as Pendiente to the applicant', async ({
		page,
	}) => {
		await page.goto(`/cuenta/credits/${seedResult.creditId}`)
		const scheduleCard = page.locator('[data-slot="card"]').filter({
			has: page.getByRole('heading', { name: /calendario de pagos/i }),
		})
		const table = scheduleCard.locator('table')
		const row = table.locator('tbody tr').nth(seedResult.pendingPaymentRowIndex)
		await row.scrollIntoViewIfNeeded()
		await expect(row.getByText(/pendiente/i)).toBeVisible()
	})

	test('shows empty state when applicant has no credits', async ({ page }) => {
		await cleanupCuentaCredits()
		await seedCuentaCreditsEmpty()
		await loginPage(page, creditsApplicant.email)
		await page.goto('/cuenta/credits')
		await expect(
			page.getByRole('heading', { name: /mis créditos/i }),
		).toBeVisible()
		await expect(page.getByText(/sin créditos todavía/i)).toBeVisible()
	})
})
