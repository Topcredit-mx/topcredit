import { expect, type Page, test } from '@playwright/test'
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

const cuentaContent = (page: Page) => page.getByRole('main')

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
		await expect(
			page.getByRole('heading', { name: /créditos en curso/i }),
		).toBeVisible()
		await expect(
			page.getByRole('heading', { name: /créditos finalizados/i }),
		).toBeVisible()
		const main = cuentaContent(page)
		await expect(main.getByText('$50,000.00').first()).toBeVisible()
		await expect(main.getByText('$30,000.00').first()).toBeVisible()

		const activeTable = main
			.locator('section')
			.filter({
				has: page.getByRole('heading', { name: /créditos en curso/i }),
			})
			.locator('table')
		const completedTable = main
			.locator('section')
			.filter({
				has: page.getByRole('heading', { name: /créditos finalizados/i }),
			})
			.locator('table')

		const nextDueIso = seedResult.nextDisbursedPaymentDueIso
		if (nextDueIso === null) {
			throw new Error('seed must expose next disbursed payment due instant')
		}
		const expectedNextPaymentLabel = await page.evaluate((iso) => {
			const d = new Date(iso)
			return d.toLocaleDateString('es-MX', {
				timeZone: 'America/Mexico_City',
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			})
		}, nextDueIso)
		const disbursedRow = activeTable
			.getByRole('row')
			.filter({ has: page.getByRole('link', { name: '$50,000.00' }) })
		const visibleNextPaymentDate = disbursedRow
			.locator('span[aria-hidden="true"]')
			.locator('> span.whitespace-nowrap')
			.first()
		await expect(visibleNextPaymentDate).toHaveText(expectedNextPaymentLabel)

		await expect(activeTable.getByText(/^Dispersado$/i)).toBeVisible()
		await expect(completedTable.getByText(/^Liquidado$/i)).toBeVisible()
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

		const main = cuentaContent(page)
		await expect(main.getByText('$50,000.00').first()).toBeVisible()
		await expect(main.getByText('12 meses')).toBeVisible()
		await expect(main.getByText('2.50%')).toBeVisible()
		await expect(main.getByText(/dispersado/i).first()).toBeVisible()
		await expect(main.getByText(/calendario de pagos/i)).toBeVisible()
		const linkToApplication = page
			.getByRole('link', { name: /ver la solicitud relacionada/i })
			.first()
		await expect(linkToApplication).toBeVisible()
		await expect(linkToApplication).toHaveAttribute(
			'href',
			`/cuenta/applications/${seedResult.applicationId}`,
		)
		await expect(main.getByText('REF-DISPersed-SEED')).toBeVisible()
		await expect(main.getByText('recibo-dispersado.pdf')).toBeVisible()
	})

	test('shows settled credit detail with liquidado status', async ({
		page,
	}) => {
		const settledId = seedResult.settledCreditId
		expect(settledId).not.toBeNull()
		await page.goto(`/cuenta/credits/${settledId}`)
		const main = cuentaContent(page)
		await expect(
			page.getByRole('heading', { name: /detalle de tu crédito/i }),
		).toBeVisible()
		await expect(main.getByText('$30,000.00').first()).toBeVisible()
		await expect(main.getByText(/liquidado/i).first()).toBeVisible()
		await expect(main.getByText('REF-SETTLED-SEED')).toBeVisible()
	})

	test('shows 404 for non-existent credit', async ({ page }) => {
		const res = await page.goto('/cuenta/credits/999999')
		expect(res?.status()).toBeGreaterThanOrEqual(400)
		await expect(
			page.getByRole('heading', { name: 'Página no encontrada' }),
		).toBeVisible()
	})

	test('applicant cannot open another applicant credit by id', async ({
		page,
	}) => {
		await loginPage(page, creditsOtherApplicant.email)
		const res = await page.goto(`/cuenta/credits/${seedResult.creditId}`)
		expect(res?.status()).toBeGreaterThanOrEqual(400)
		await expect(
			page.getByRole('heading', { name: 'Página no encontrada' }),
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
		const amountLabel = seedResult.firstDisbursedPaymentAmountLabel
		if (amountLabel === null) {
			throw new Error('seed must expose first disbursed payment amount label')
		}
		await expect(firstRow.getByText(amountLabel)).toBeVisible()
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

	test('shows HR-only confirmed payment as En proceso to the applicant', async ({
		page,
	}) => {
		await page.goto(`/cuenta/credits/${seedResult.creditId}`)
		const scheduleCard = page.locator('[data-slot="card"]').filter({
			has: page.getByRole('heading', { name: /calendario de pagos/i }),
		})
		const table = scheduleCard.locator('table')
		const row = table
			.locator('tbody tr')
			.nth(seedResult.processingPaymentRowIndex)
		await row.scrollIntoViewIfNeeded()
		await expect(row.getByText(/en proceso/i)).toBeVisible()
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
