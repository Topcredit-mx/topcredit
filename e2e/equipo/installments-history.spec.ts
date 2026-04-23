import { expect, test } from '@playwright/test'
import type { SeedInstallmentsQueueResult } from '~/e2e/server/tasks'
import {
	cleanupInstallmentsQueue,
	seedInstallmentsQueue,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	installmentAgentQueue,
	nonInstallmentsAgentQueue,
} from './installments-agents.fixtures'

registerDbSpecGuards()

test.describe('Installments confirmation history', () => {
	let seed: SeedInstallmentsQueueResult

	test.beforeAll(async () => {
		await cleanupInstallmentsQueue()
		seed = await seedInstallmentsQueue()
	})

	test.afterAll(async () => {
		await cleanupInstallmentsQueue()
	})

	test.describe('Installments agent views installment history on the installments page', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, installmentAgentQueue.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('shows the installments history preview section heading', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			await expect(
				page.getByText(/historial de instalaciones/i).first(),
			).toBeVisible()
		})

		test('shows confirmed installments in the history list', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			const section = page.locator(
				'[aria-labelledby="installments-history-preview-heading"]',
			)
			await expect(
				section.getByText(seed.applicant1Name, { exact: true }).first(),
			).toBeVisible()
		})

		test('shows who confirmed each installment', async ({ page }) => {
			await page.goto('/equipo/installments')
			const section = page.locator(
				'[aria-labelledby="installments-history-preview-heading"]',
			)
			await expect(
				section
					.getByText(new RegExp(seed.installmentConfirmedByUserName, 'i'))
					.first(),
			).toBeVisible()
		})

		test('shows the on-time badge for an installment confirmed before its due date', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			const section = page.locator(
				'[aria-labelledby="installments-history-preview-heading"]',
			)
			await expect(section.getByText(/a tiempo/i).first()).toBeVisible()
		})

		test('shows the late badge for an installment confirmed after its due date', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			const section = page.locator(
				'[aria-labelledby="installments-history-preview-heading"]',
			)
			await expect(
				section.getByText(seed.applicant2Name, { exact: true }).first(),
			).toBeVisible()
			await expect(section.getByText(/tarde/i).first()).toBeVisible()
		})

		test('orders history from most recent confirmation to oldest', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			const main = page.locator(
				'[aria-labelledby="installments-history-preview-heading"]',
			)
			const li1 = main
				.getByText(seed.applicant1Name, { exact: true })
				.first()
				.locator('xpath=ancestor::li[1]')
			const li2 = main
				.getByText(seed.applicant2Name, { exact: true })
				.first()
				.locator('xpath=ancestor::li[1]')
			const onTimeIndex = await li1.evaluate((el: HTMLElement) => {
				const li = el.closest('li')
				if (!li) return -1
				const ul = li.parentElement
				if (!ul) return -1
				return [...ul.querySelectorAll('li')].indexOf(li)
			})
			const lateIndex = await li2.evaluate((el: HTMLElement) => {
				const li = el.closest('li')
				if (!li) return -1
				const ul = li.parentElement
				if (!ul) return -1
				return [...ul.querySelectorAll('li')].indexOf(li)
			})
			expect(lateIndex).toBeGreaterThan(onTimeIndex)
		})

		test('shows a link to the application detail for each history row', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			const section = page.locator(
				'[aria-labelledby="installments-history-preview-heading"]',
			)
			await expect(
				section.locator(
					`a[href="/equipo/applications/${seed.onTimeInstallmentApplicationId}"]`,
				),
			).toBeVisible()
			await expect(
				section.locator(
					`a[href="/equipo/applications/${seed.lateInstallmentApplicationId}"]`,
				),
			).toBeVisible()
		})

		test('shows a link to the full history page', async ({ page }) => {
			await page.goto('/equipo/installments')
			const link = page.locator('main a[href="/equipo/installments/history"]')
			await link.scrollIntoViewIfNeeded()
			await expect(link).toBeVisible()
		})
	})

	test.describe('Installments agent views the full installments history page', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, installmentAgentQueue.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('shows the full history page with all confirmed installments', async ({
			page,
		}) => {
			await page.goto('/equipo/installments/history')
			await expect(
				page
					.getByRole('navigation', { name: 'Breadcrumb' })
					.getByText(/historial/i),
			).toBeVisible()
			await expect(
				page.getByText(seed.applicant1Name, { exact: true }).first(),
			).toBeVisible()
			await expect(
				page.getByText(seed.applicant2Name, { exact: true }).first(),
			).toBeVisible()
		})

		test('shows three installments overview cards on the full history page', async ({
			page,
		}) => {
			await page.goto('/equipo/installments/history')
			await expect(
				page.getByRole('heading', { name: /resumen de instalaciones/i }),
			).toBeVisible()
			await expect(
				page.getByText(/total cobrado \(7 días\)/i).first(),
			).toBeVisible()
			await expect(
				page.getByText(/instalaciones cobradas \(7 días\)/i).first(),
			).toBeVisible()
			await expect(
				page
					.getByText(/antigüedad de la instalación pendiente más antigua/i)
					.first(),
			).toBeVisible()
		})

		test('shows weekly comparison on collected metrics on the full history page', async ({
			page,
		}) => {
			await page.goto('/equipo/installments/history')
			const overview = page.locator(
				'[aria-labelledby="installments-overview-heading"]',
			)
			await expect(overview).toBeVisible()
			await expect(overview.getByText(/vs semana anterior/i)).toHaveCount(2)
		})

		test('shows an em dash for oldest pending on the history-only screen', async ({
			page,
		}) => {
			await page.goto('/equipo/installments/history')
			const card = page
				.locator('[data-slot="card"]')
				.filter({
					has: page.getByText(
						/antigüedad de la instalación pendiente más antigua/i,
					),
				})
				.first()
			await expect(card.getByText('—').first()).toBeVisible()
		})
	})

	test.describe('Agent without installments role cannot access installments history', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, nonInstallmentsAgentQueue.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('redirects to unauthorized when accessing the full history page', async ({
			page,
		}) => {
			await page.goto('/equipo/installments/history')
			await expect(page).toHaveURL(/\/unauthorized/)
		})
	})
})
