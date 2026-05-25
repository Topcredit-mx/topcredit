import { expect, test } from '@playwright/test'
import type { SeedApplicationsReviewResult } from '~/e2e/server/tasks'
import {
	cleanupApplicationsReview,
	seedApplicationsReview,
	seedPreAuthorizedPackageDocuments,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import {
	expectDisbursementReceiptSuccess,
	expectLocalFileSelectionVisible,
	pickLocalDocumentFile,
	postToCuentaApplicationUrl,
	waitForSuccessfulPost,
} from '../helpers/document-upload'
import {
	assertEquipoApplicationShowsAppStatus,
	clickEquipoDocumentReviewSubmitByName,
	selectDocumentDecisionInRow,
} from '../helpers/equipo-document-review'
import { selectRadix } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	applicantPreAuth,
	authorizationsAgentForReview,
	dispersionsAgentForReviewCompany,
	hrAgentForReviewCompany,
	preAuthAgentForReview,
} from './applications-review.fixtures'

registerDbSpecGuards()

const preAuthSubmitName = /pre-autorizar la solicitud/i
const packageAuthorization = 'e2e-authorization.pdf'
const packageContract = 'e2e-contract.pdf'
const packagePayroll = 'e2e-payroll.pdf'

test.describe('Pre-authorized amount requested by applicant', () => {
	let seed: SeedApplicationsReviewResult

	test.beforeEach(async () => {
		seed = await seedApplicationsReview()
	})

	test.afterEach(async () => {
		await cleanupApplicationsReview({ termId: seed.termId })
	})

	test('pre-auth 30k, applicant 20k, auth/HR/dispersions see correct amounts', async ({
		page,
	}) => {
		const applicationId = seed.preAuthApplicationId

		await loginPage(page, preAuthAgentForReview.email)
		await setSelectedCompanyId(page, seed.companyId)
		await page.goto(`/equipo/applications/${applicationId}`)
		await assertEquipoApplicationShowsAppStatus(page, /aprobada/i)
		await page
			.getByRole('button', { name: /acciones/i })
			.first()
			.click()
		await page.getByRole('menuitem', { name: /pre-autorizar/i }).click()
		const preAuthDialog = page.getByRole('dialog')
		await expect(preAuthDialog).toBeVisible()
		await selectRadix(page, 'label:Plazo', '12 meses')
		await preAuthDialog.locator('input[name="creditAmount"]').fill('30000')
		await preAuthDialog.getByRole('button', { name: preAuthSubmitName }).click()
		await assertEquipoApplicationShowsAppStatus(page, /preautorizado/i)
		await expect(page.getByText(/\$30,000\.00/i).first()).toBeVisible()

		await seedPreAuthorizedPackageDocuments({
			applicationId,
			variant: 'initialIntakeApprovedAndPackagePending',
		})

		await loginPage(page, applicantPreAuth.email)
		await page.goto(`/cuenta/applications/${applicationId}/pre-authorized`)
		await expect(
			page.getByRole('heading', { name: /monto a solicitar/i }),
		).toBeVisible()
		await page.getByLabel(/importe deseado/i).fill('20000')
		const submitPromise = waitForSuccessfulPost(
			page,
			postToCuentaApplicationUrl(applicationId),
		)
		await page.getByRole('button', { name: /^Enviar$/i }).click()
		await submitPromise

		await page.goto(`/cuenta/applications/${applicationId}`)
		await expect(page.getByText(/\$20,000\.00/i).first()).toBeVisible()
		await expect(page.getByText(/preautorizado:\s*\$30,000\.00/i)).toBeVisible()

		await loginPage(page, authorizationsAgentForReview.email)
		await setSelectedCompanyId(page, seed.companyId)
		await page.goto(`/equipo/applications/${applicationId}`)
		await assertEquipoApplicationShowsAppStatus(
			page,
			/en revisión de autorización/i,
		)
		const detail = page.locator(
			'[aria-labelledby="equipo-application-detail-title"]',
		)
		await expect(detail.getByText(/\$30,000\.00/i).first()).toBeVisible()
		await expect(detail.getByText(/\$20,000\.00/i).first()).toBeVisible()
		await expect(detail.getByText(/monto preautorizado/i)).toBeVisible()
		await expect(detail.getByText(/monto solicitado/i)).toBeVisible()

		await selectDocumentDecisionInRow(page, packageAuthorization, 'approve')
		await selectDocumentDecisionInRow(page, packageContract, 'approve')
		await selectDocumentDecisionInRow(page, packagePayroll, 'approve')
		await clickEquipoDocumentReviewSubmitByName(page, /autorizar la solicitud/i)
		await assertEquipoApplicationShowsAppStatus(page, /autorizado/i)
		await expect(detail.getByText(/\$20,000\.00/i).first()).toBeVisible()
		await expect(detail.getByText(/\$30,000\.00/i)).toHaveCount(0)

		await loginPage(page, hrAgentForReviewCompany.email)
		await setSelectedCompanyId(page, seed.companyId)
		await page.goto(`/equipo/applications/${applicationId}`)
		await expect(page.getByText(/\$20,000\.00/i).first()).toBeVisible()
		await expect(page.getByText(/\$30,000\.00/i)).toHaveCount(0)
		await page.getByRole('button', { name: /aprobar rh/i }).click()
		await expect(page.getByText(/pendiente rh/i)).toHaveCount(0)

		await loginPage(page, dispersionsAgentForReviewCompany.email)
		await setSelectedCompanyId(page, seed.companyId)
		await page.goto(`/equipo/applications/${applicationId}`)
		const main = page.getByRole('main')
		const disburseForm = main.locator('form:has(input[name="receipt"])').first()
		await expect(disburseForm.locator('#disburseAmount')).toHaveValue(
			'$20,000.00',
		)
		await expect(
			disburseForm.getByText(/preautorizado:\s*\$30,000\.00/i),
		).toBeVisible()
		await main
			.locator('input[name="transferReference"]')
			.first()
			.fill('REF-REDUCED-20K')
		await pickLocalDocumentFile({
			container: disburseForm,
			fileInput: disburseForm.locator('input[name="receipt"]'),
		})
		await expectLocalFileSelectionVisible(disburseForm)
		const disbursePromise = waitForSuccessfulPost(
			page,
			new RegExp(`/equipo/applications/${applicationId}`),
		)
		await disburseForm.getByRole('button', { name: /dispersar/i }).click()
		await disbursePromise
		await expectDisbursementReceiptSuccess(page, {
			transferReference: 'REF-REDUCED-20K',
		})
	})
})
