import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import type { SeedDisbursementReviewResult } from '~/e2e/server/tasks'
import {
	cleanupDisbursementReview,
	seedDisbursementReview,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	dispersionsAgent,
	nonDispersionsAgent,
} from './disbursement-agents.fixtures'

const SAMPLE_WEBP = join(process.cwd(), 'e2e/fixtures/sample-document.webp')

const dispersionesQueuePath = '/equipo/applications/queues/dispersiones'

registerDbSpecGuards()

test.describe('Disbursement agent flow', () => {
	let seed: SeedDisbursementReviewResult

	test.beforeAll(async () => {
		await cleanupDisbursementReview()
		seed = await seedDisbursementReview()
	})

	test.afterAll(async () => {
		await cleanupDisbursementReview()
	})

	test.describe('Dispersions agent views disbursement queue', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, dispersionsAgent.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('sees Dispersiones nav link pointing to disbursement queue', async ({
			page,
		}) => {
			await page.goto('/equipo')
			const nav = page.getByRole('navigation', { name: 'Navegación' })
			const link = nav.getByRole('link', { name: 'Dispersiones' })
			await expect(link).toBeVisible()
			await expect(link).toHaveAttribute('href', dispersionesQueuePath)
		})

		test('sees only HR-approved applications in disbursement queue', async ({
			page,
		}) => {
			await page.goto(dispersionesQueuePath)
			await expect(page.getByRole('main')).toBeVisible()
			await expect(mainDataTable(page)).toBeVisible()
			await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(2)
		})

		test('does not show HR-pending application in disbursement queue', async ({
			page,
		}) => {
			await page.goto(dispersionesQueuePath)
			await expect(page.getByRole('main')).toBeVisible()
			await expect(mainDataTable(page)).toBeVisible()
			await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(2)
			await expect(
				page.getByText(seed.hrPendingApplicantName, { exact: true }),
			).toHaveCount(0)
		})
	})

	test.describe('Non-dispersions agent does not see Dispersiones nav', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, nonDispersionsAgent.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('does not see Dispersiones nav link', async ({ page }) => {
			await page.goto('/equipo')
			const nav = page.getByRole('navigation', { name: 'Navegación' })
			await expect(nav.getByText('Dispersiones')).toHaveCount(0)
		})
	})

	test.describe('Dispersions agent disburses an application', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, dispersionsAgent.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('fills disburse form and application moves to disbursed', async ({
			page,
		}) => {
			await page.goto(`${dispersionesQueuePath}/${seed.applicationId}`)
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			await expect(page.getByText(/autorizado/i).first()).toBeVisible()
			await page
				.getByRole('main')
				.locator('input[name="transferReference"]')
				.first()
				.fill('REF-DISB-001')
			await page
				.getByRole('main')
				.locator('input[name="receipt"]')
				.first()
				.setInputFiles(SAMPLE_WEBP)
			await page.getByRole('button', { name: /dispersar/i }).click()
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			await expect(page.getByText(/dispersado/i).first()).toBeVisible()
			await expect(page.getByText('REF-DISB-001').first()).toBeVisible()
			await page.goto(dispersionesQueuePath)
			await expect(page.getByRole('main')).toBeVisible()
			await expect(mainDataTable(page)).toBeVisible()
			await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(1)
		})

		test('non-dispersions agent does not see disburse form', async ({
			page,
		}) => {
			await loginPage(page, nonDispersionsAgent.email)
			await setSelectedCompanyId(page, seed.companyId)
			await page.goto(`${dispersionesQueuePath}/${seed.applicationId}`)
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			await expect(page.locator('input[name="transferReference"]')).toHaveCount(
				0,
			)
		})
	})
})
