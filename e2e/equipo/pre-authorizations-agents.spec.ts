import { expect, test } from '@playwright/test'
import type { SeedApplicationsReviewResult } from '~/e2e/server/tasks'
import {
	cleanupApplicationsReview,
	seedApplicationsReview,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { assertEquipoApplicationShowsAppStatus } from '../helpers/equipo-document-review'
import { selectRadix } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	adminForReview,
	preAuthAgentForReview,
} from './applications-review.fixtures'

registerDbSpecGuards()

const preAuthAgentEmail = preAuthAgentForReview.email

const EXPECTED_PREAUTH_MAX_MXN = '$139,941.69'

test.describe('Pre-authorizations agents', () => {
	let seed: SeedApplicationsReviewResult

	test.beforeEach(async () => {
		seed = await seedApplicationsReview()
	})

	test.afterEach(async () => {
		await cleanupApplicationsReview({ termId: seed.termId })
	})

	test.beforeEach(async ({ page }) => {
		await loginPage(page, preAuthAgentEmail)
		await setSelectedCompanyId(page, seed.companyId)
	})

	test('disables pre-autorizar when amount exceeds borrowing capacity', async ({
		page,
	}) => {
		await page.goto(`/equipo/applications/${seed.preAuthApplicationId}`)
		await assertEquipoApplicationShowsAppStatus(page, /aprobada/i)
		await page
			.getByRole('button', { name: /acciones/i })
			.first()
			.click()
		await page.getByRole('menuitem', { name: /pre-autorizar/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		await selectRadix(page, 'label:Plazo', '12 meses')
		const withinDialog = dialog
		await expect(withinDialog.getByText(/máximo/i).first()).toBeVisible()
		await expect(withinDialog.getByText(/máximo/i).first()).toContainText(
			'139,941',
		)
		await dialog.locator('input[name="creditAmount"]').fill('9999999')
		await expect(withinDialog.getByText(/máximo/i).first()).toBeHidden()
		await expect(withinDialog.getByRole('alert')).toBeVisible()
		await expect(withinDialog.getByRole('alert')).toContainText('139,941')
		await expect(
			dialog.getByRole('button', { name: /^pre-autorizar$/i }),
		).toBeDisabled()
	})

	test('can assign amount and term before pre-authorizing an approved application', async ({
		page,
	}) => {
		await page.goto(`/equipo/applications/${seed.preAuthApplicationId}`)
		await assertEquipoApplicationShowsAppStatus(page, /aprobada/i)
		const history = page.locator(
			'section[aria-labelledby="application-status-history-heading"]',
		)
		await expect(history).toBeVisible()
		await expect(
			history.getByRole('heading', { name: /historial de estado/i }),
		).toBeVisible()
		await expect(history.locator('ol li')).toHaveCount(2)
		await expect(history).toContainText('Aprobada')
		await expect(history).toContainText('Pendiente')
		await expect(page.getByText(/por definir/i).first()).toBeVisible()
		await page
			.getByRole('button', { name: /acciones/i })
			.first()
			.click()
		await page.getByRole('menuitem', { name: /pre-autorizar/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(
			dialog.getByRole('heading', { name: /monto y plazo/i }),
		).toBeVisible()
		await selectRadix(page, 'label:Plazo', '12 meses')
		await expect(dialog.getByText(/máximo/i).first()).toContainText(
			EXPECTED_PREAUTH_MAX_MXN,
		)
		await dialog.locator('input[name="creditAmount"]').fill('18000')
		await dialog.getByRole('button', { name: /^pre-autorizar$/i }).click()
		await assertEquipoApplicationShowsAppStatus(page, /preautorizado/i)
		await expect(history.locator('ol li')).toHaveCount(3)
		await expect(history).toContainText('Preautorizado')
		await expect(history).toContainText('Aprobada')
		await expect(page.getByText('18,000').first()).toBeVisible()
		await expect(page.getByText('12 meses').first()).toBeVisible()
	})
})

test.describe('Pre-authorizations admin', () => {
	let seed: SeedApplicationsReviewResult

	test.beforeEach(async () => {
		seed = await seedApplicationsReview()
	})

	test.afterEach(async () => {
		await cleanupApplicationsReview({ termId: seed.termId })
	})

	test.beforeEach(async ({ page }) => {
		await loginPage(page, adminForReview.email)
		await setSelectedCompanyId(page, seed.companyId)
	})

	test('can pre-authorize above borrowing capacity (admin override)', async ({
		page,
	}) => {
		await page.goto(`/equipo/applications/${seed.preAuthApplicationId}`)
		await assertEquipoApplicationShowsAppStatus(page, /aprobada/i)
		await page
			.getByRole('button', { name: /acciones/i })
			.first()
			.click()
		await page.getByRole('menuitem', { name: /pre-autorizar/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		await selectRadix(page, 'label:Plazo', '12 meses')
		await dialog.locator('input[name="creditAmount"]').fill('9999999')
		const submitPre = dialog.getByRole('button', { name: /pre-autorizar/i })
		await expect(submitPre).toBeEnabled()
		await submitPre.click()
		await expect(page.getByRole('dialog')).toBeHidden({ timeout: 30_000 })
		await assertEquipoApplicationShowsAppStatus(page, /preautorizado/i)
	})
})
