import { expect, test } from '@playwright/test'
import type { SeedApplicationsReviewResult } from '~/e2e/server/tasks'
import {
	cleanupApplicationsReview,
	seedApplicationsReview,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import {
	assertEquipoApplicationShowsAppStatus,
	assertEquipoDocumentRowDecisionsDisabled,
	assertEquipoDocumentRowStatus,
	clickDocumentReviewAuthorizeOnly,
	clickEquipoDocumentReviewSubmitByName,
	EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT,
	EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE,
	EQUIPO_DOCUMENTS_CARD_SCOPE,
	openEquipoApplicationActions,
	selectDocumentDecisionInRow,
	submitEquipoDocumentReviewForm,
	typeDocumentRejectionReasonInRow,
} from '../helpers/equipo-document-review'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	adminForReview,
	authorizationsAgentForReview,
} from './applications-review.fixtures'

registerDbSpecGuards()

test.describe('Authorizations agents', () => {
	let seed: SeedApplicationsReviewResult

	test.beforeEach(async () => {
		seed = await seedApplicationsReview()
	})

	test.afterEach(async () => {
		await cleanupApplicationsReview({ termId: seed.termId })
	})

	test.describe('Authorizations specialist', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, authorizationsAgentForReview.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('does not show application actions on a pending requests-stage application', async ({
			page,
		}) => {
			await page.goto(`/equipo/applications/${seed.applicationId}`)
			await assertEquipoApplicationShowsAppStatus(page, /pendiente/i)
			await expect(
				page
					.locator('[aria-labelledby="equipo-application-detail-title"]')
					.getByRole('button', { name: /acciones/i }),
			).toHaveCount(0)
		})

		test('authorizes when all package documents are approved in one submit', async ({
			page,
		}) => {
			const authzId = seed.authzApplicationId
			const intakeIne = `seed-intake-ine-authz-${authzId}.pdf`
			const intakeAddress = `seed-intake-address-authz-${authzId}.pdf`
			const intakeBank = `seed-intake-bank-authz-${authzId}.pdf`
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
			await assertEquipoDocumentRowDecisionsDisabled(page, intakeIne)
			await assertEquipoDocumentRowDecisionsDisabled(page, intakeAddress)
			await assertEquipoDocumentRowDecisionsDisabled(page, intakeBank)
			const card = page.locator(EQUIPO_DOCUMENTS_CARD_SCOPE)
			await expect(card).toContainText(intakeIne)
			await expect(card).toContainText(intakeAddress)
			await expect(card).toContainText(intakeBank)
			await expect(card).toContainText(packageAuthorization)
			await expect(card).toContainText(packageContract)
			await expect(card).toContainText(packagePayroll)
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
			await assertEquipoDocumentRowStatus(
				page,
				packageAuthorization,
				'approved',
			)
			await assertEquipoDocumentRowStatus(page, packageContract, 'approved')
			await assertEquipoDocumentRowStatus(page, packagePayroll, 'approved')
			await assertEquipoDocumentRowDecisionsDisabled(page, intakeIne)
			await assertEquipoDocumentRowDecisionsDisabled(page, intakeAddress)
			await assertEquipoDocumentRowDecisionsDisabled(page, intakeBank)
			await assertEquipoApplicationShowsAppStatus(page, /autorizado/i)
		})

		test('reopens to awaiting-authorization when rejecting a package document after authorize', async ({
			page,
		}) => {
			const authzId = seed.authzApplicationId
			const contractFile = `seed-contract-authz-${authzId}.pdf`
			const packageAuthorization = `seed-authorization-authz-${authzId}.pdf`
			const packagePayroll = `seed-payroll-authz-${authzId}.pdf`
			await page.goto(`/equipo/applications/${authzId}`)
			await assertEquipoApplicationShowsAppStatus(
				page,
				/en revisión de autorización/i,
			)
			await selectDocumentDecisionInRow(page, packageAuthorization, 'approve')
			await selectDocumentDecisionInRow(page, contractFile, 'approve')
			await selectDocumentDecisionInRow(page, packagePayroll, 'approve')
			await clickEquipoDocumentReviewSubmitByName(page, /guardar y autorizar/i)
			await assertEquipoDocumentRowStatus(
				page,
				packageAuthorization,
				'approved',
			)
			await assertEquipoDocumentRowStatus(page, contractFile, 'approved')
			await assertEquipoDocumentRowStatus(page, packagePayroll, 'approved')
			await assertEquipoApplicationShowsAppStatus(page, /autorizado/i)
			const reopenReason = 'E2E: corrección solicitada tras autorizar'
			await selectDocumentDecisionInRow(page, contractFile, 'reject')
			await typeDocumentRejectionReasonInRow(page, contractFile, reopenReason)
			await clickEquipoDocumentReviewSubmitByName(page, /solicitar cambios/i)
			await assertEquipoApplicationShowsAppStatus(
				page,
				/en revisión de autorización/i,
			)
			await assertEquipoDocumentRowStatus(
				page,
				contractFile,
				'rejected',
				reopenReason,
			)
		})

		test('shows validation error when rejecting a package document without reason', async ({
			page,
		}) => {
			const appId = seed.authzDenyApplicationId
			const fileName = `seed-contract-authz-${appId}.pdf`
			const intakeIne = `seed-intake-ine-authz-${appId}.pdf`
			const intakeAddress = `seed-intake-address-authz-${appId}.pdf`
			const intakeBank = `seed-intake-bank-authz-${appId}.pdf`
			await page.goto(`/equipo/applications/${appId}`)
			await assertEquipoApplicationShowsAppStatus(
				page,
				/en revisión de autorización/i,
			)
			await expect(
				page.locator(`${EQUIPO_DOCUMENTS_CARD_SCOPE} ul > li`),
			).toHaveCount(EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT)
			await assertEquipoDocumentRowDecisionsDisabled(page, intakeIne)
			await assertEquipoDocumentRowDecisionsDisabled(page, intakeAddress)
			await assertEquipoDocumentRowDecisionsDisabled(page, intakeBank)
			await selectDocumentDecisionInRow(page, fileName, 'reject')
			await submitEquipoDocumentReviewForm(page)
			await expect(
				page.getByText('El motivo de rechazo es obligatorio'),
			).toBeVisible()
		})

		test('shows rejected state and reason when rejecting a package document with reason', async ({
			page,
		}) => {
			const reason = 'Carta ilegible en E2E'
			const appId = seed.authzDenyApplicationId
			const fileName = `seed-authorization-authz-${appId}.pdf`
			const intakeIne = `seed-intake-ine-authz-${appId}.pdf`
			const intakeAddress = `seed-intake-address-authz-${appId}.pdf`
			const intakeBank = `seed-intake-bank-authz-${appId}.pdf`
			await page.goto(`/equipo/applications/${appId}`)
			await assertEquipoApplicationShowsAppStatus(
				page,
				/en revisión de autorización/i,
			)
			await expect(
				page.locator(`${EQUIPO_DOCUMENTS_CARD_SCOPE} ul > li`),
			).toHaveCount(EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT)
			await assertEquipoDocumentRowDecisionsDisabled(page, intakeIne)
			await assertEquipoDocumentRowDecisionsDisabled(page, intakeAddress)
			await assertEquipoDocumentRowDecisionsDisabled(page, intakeBank)
			await selectDocumentDecisionInRow(page, fileName, 'reject')
			await typeDocumentRejectionReasonInRow(page, fileName, reason)
			await submitEquipoDocumentReviewForm(page)
			await assertEquipoDocumentRowStatus(page, fileName, 'rejected', reason)
		})

		test('denies an awaiting-authorization application', async ({ page }) => {
			const appId = seed.authzDenyApplicationId
			const intakeIne = `seed-intake-ine-authz-${appId}.pdf`
			const intakeAddress = `seed-intake-address-authz-${appId}.pdf`
			const intakeBank = `seed-intake-bank-authz-${appId}.pdf`
			await page.goto(`/equipo/applications/${appId}`)
			await assertEquipoApplicationShowsAppStatus(
				page,
				/en revisión de autorización/i,
			)
			await expect(
				page.locator(`${EQUIPO_DOCUMENTS_CARD_SCOPE} ul > li`),
			).toHaveCount(EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT)
			await assertEquipoDocumentRowDecisionsDisabled(page, intakeIne)
			await assertEquipoDocumentRowDecisionsDisabled(page, intakeAddress)
			await assertEquipoDocumentRowDecisionsDisabled(page, intakeBank)
			await openEquipoApplicationActions(page)
			await page
				.getByRole('menuitem', { name: /rechazar/i })
				.first()
				.click()
			const dialog = page.getByRole('dialog')
			await dialog
				.locator('textarea[name="reason"]')
				.fill('E2E rechazo en revisión de autorización')
			await dialog.getByRole('button', { name: /confirmar/i }).click()
			await assertEquipoApplicationShowsAppStatus(page, /denegado/i)
		})
	})

	test.describe('Admin', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, adminForReview.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('can authorize when the authorization package is already approved', async ({
			page,
		}) => {
			const appId = seed.authzAdminApplicationId
			await page.goto(`/equipo/applications/${appId}`)
			await assertEquipoApplicationShowsAppStatus(
				page,
				/en revisión de autorización/i,
			)
			await expect(
				page.locator(`${EQUIPO_DOCUMENTS_CARD_SCOPE} ul > li`),
			).toHaveCount(EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT)
			await clickDocumentReviewAuthorizeOnly(page)
			await assertEquipoApplicationShowsAppStatus(page, /autorizado/i)
		})
	})
})
