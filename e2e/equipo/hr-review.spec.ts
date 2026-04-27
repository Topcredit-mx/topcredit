import { expect, test } from '@playwright/test'
import type { SeedHrReviewResult } from '~/e2e/server/tasks'
import { cleanupHrReview, seedHrReview } from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	adminForHr,
	authorizationsAgentForHr,
	hrAgentForReview,
} from './hr-agents.fixtures'

registerDbSpecGuards()

const solicitudesRhQueuePath = '/equipo/applications/queues/solicitudes-rh'

test.describe('HR agent flow', () => {
	let seed: SeedHrReviewResult

	test.beforeAll(async () => {
		await cleanupHrReview()
		seed = await seedHrReview()
	})

	test.afterAll(async () => {
		await cleanupHrReview()
	})

	test.describe('HR agent views authorized application', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, hrAgentForReview.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('sees application in the HR queue', async ({ page }) => {
			await page.goto(solicitudesRhQueuePath)
			await expect(page.getByRole('main')).toBeVisible()
			await expect(mainDataTable(page)).toBeVisible()
			const n = await mainDataTable(page).locator('tbody tr').count()
			expect(n).toBeGreaterThanOrEqual(1)
		})

		test('sees HR approve form on authorized application detail', async ({
			page,
		}) => {
			await page.goto(`${solicitudesRhQueuePath}/${seed.applicationId}`)
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			await expect(page.getByText(/pendiente rh/i).first()).toBeVisible()
			await expect(
				page.getByRole('button', { name: /aprobar rh/i }),
			).toBeVisible()
		})

		test('sets first discount date and approves with suggested date', async ({
			page,
		}) => {
			await page.goto(`${solicitudesRhQueuePath}/${seed.applicationId}`)
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			const sel = page.locator('select[name="firstDiscountDate"]')
			await expect(sel).toBeVisible()
			const optCount = await sel.locator('option').count()
			expect(optCount).toBeGreaterThanOrEqual(2)
			await page.getByRole('button', { name: /aprobar rh/i }).click()
			await expect(page.getByText(/pendiente rh/i)).toHaveCount(0)
			await expect(
				page.getByText(/fecha de primer descuento/i).first(),
			).toBeVisible()
		})

		test('picks a different date than the preset and approves', async ({
			page,
		}) => {
			await page.goto(
				`${solicitudesRhQueuePath}/${seed.differentDateApplicationId}`,
			)
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			const sel = page.locator('select[name="firstDiscountDate"]')
			await expect(sel).toBeVisible()
			const secondVal = await sel.locator('option').nth(1).getAttribute('value')
			expect(secondVal).toBeTruthy()
			await sel.selectOption(secondVal as string)
			await page.getByRole('button', { name: /aprobar rh/i }).click()
			await expect(page.getByText(/pendiente rh/i)).toHaveCount(0)
			await expect(
				page.getByText(/fecha de primer descuento/i).first(),
			).toBeVisible()
		})
	})

	test.describe('Admin approves HR flow', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, adminForHr.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('sees HR approve form and approves as admin', async ({ page }) => {
			await page.goto(`${solicitudesRhQueuePath}/${seed.adminApplicationId}`)
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			await expect(page.getByText(/pendiente rh/i).first()).toBeVisible()
			await page.getByRole('button', { name: /aprobar rh/i }).click()
			await expect(page.getByText(/pendiente rh/i)).toHaveCount(0)
			await expect(
				page.getByText(/fecha de primer descuento/i).first(),
			).toBeVisible()
		})
	})

	test.describe('Non-HR agent does not see HR controls', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, authorizationsAgentForHr.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('does not see HR approve form on authorized application', async ({
			page,
		}) => {
			await page.goto(`${solicitudesRhQueuePath}/${seed.applicationId}`)
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			await expect(
				page.getByRole('button', { name: /aprobar rh/i }),
			).toHaveCount(0)
		})
	})
})
