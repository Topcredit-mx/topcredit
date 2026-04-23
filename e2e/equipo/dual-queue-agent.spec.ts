import { expect, test } from '@playwright/test'
import type { SeedApplicationsReviewResult } from '~/e2e/server/tasks'
import {
	cleanupApplicationsReview,
	insertApplicationDocument,
	seedApplicationsReview,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import {
	assertEquipoApplicationShowsAppStatus,
	assertEquipoDocumentRowStatus,
	clickEquipoDocumentReviewSubmitByName,
	EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT,
	EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE,
	EQUIPO_DOCUMENTS_CARD_SCOPE,
	selectDocumentDecisionInRow,
	submitEquipoDocumentReviewForm,
} from '../helpers/equipo-document-review'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import { dualQueueAgentForReview } from './applications-review.fixtures'

registerDbSpecGuards()

test.describe('Dual queue agent (requests + authorizations)', () => {
	let seed: SeedApplicationsReviewResult

	test.beforeEach(async () => {
		seed = await seedApplicationsReview()
	})

	test.afterEach(async () => {
		await cleanupApplicationsReview({ termId: seed.termId })
	})

	test.beforeEach(async ({ page }) => {
		await loginPage(page, dualQueueAgentForReview.email)
		await setSelectedCompanyId(page, seed.companyId)
	})

	test('can approve an initial-intake document on a pending application', async ({
		page,
	}) => {
		await insertApplicationDocument({
			applicationId: seed.applicationId,
			documentType: 'official-id',
			fileName: 'dual-intake-ine.pdf',
			storageKey: 'application-documents/e2e-dual-intake.pdf',
		})
		await page.goto(`/equipo/applications/${seed.applicationId}`)
		await expect(
			page.getByRole('heading', { name: /detalle de solicitud/i }),
		).toBeVisible()
		await assertEquipoApplicationShowsAppStatus(page, /pendiente/i)
		await selectDocumentDecisionInRow(page, 'dual-intake-ine.pdf', 'approve')
		await submitEquipoDocumentReviewForm(page)
		await assertEquipoDocumentRowStatus(page, 'dual-intake-ine.pdf', 'approved')
	})

	test('can approve the authorization package and authorize the application', async ({
		page,
	}) => {
		const authzId = seed.authzApplicationId
		const packageAuthorization = `seed-authorization-authz-${authzId}.pdf`
		const packageContract = `seed-contract-authz-${authzId}.pdf`
		const packagePayroll = `seed-payroll-authz-${authzId}.pdf`
		await page.goto(`/equipo/applications/${authzId}`)
		await assertEquipoApplicationShowsAppStatus(
			page,
			/en revisión de autorización/i,
		)
		await expect(
			page.locator(`${EQUIPO_DOCUMENTS_CARD_SCOPE} ul > li`),
		).toHaveCount(EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT)
		await expect(
			page
				.locator(EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE)
				.locator('.border-t.pt-4 button[type="submit"]')
				.first(),
		).toBeDisabled()
		await selectDocumentDecisionInRow(page, packageAuthorization, 'approve')
		await selectDocumentDecisionInRow(page, packageContract, 'approve')
		await selectDocumentDecisionInRow(page, packagePayroll, 'approve')
		await clickEquipoDocumentReviewSubmitByName(page, /guardar y autorizar/i)
		await assertEquipoDocumentRowStatus(page, packageAuthorization, 'approved')
		await assertEquipoDocumentRowStatus(page, packageContract, 'approved')
		await assertEquipoDocumentRowStatus(page, packagePayroll, 'approved')
		await assertEquipoApplicationShowsAppStatus(page, /autorizado/i)
	})
})
