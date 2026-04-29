import { expect, test } from '@playwright/test'
import type { SeedApplicationsReviewResult } from '~/e2e/server/tasks'
import {
	cleanupApplicationsReview,
	insertApplicationDocument,
	seedApplicationsReview,
} from '~/e2e/server/tasks'
import {
	clearSelectedCompanyIdCookie,
	loginPage,
	setSelectedCompanyId,
} from '../helpers/auth'
import {
	assertEquipoApplicationDetailLoaded,
	assertEquipoApplicationShowsAppStatus,
	assertEquipoDocumentRowStatus,
	clickEquipoDocumentReviewSubmitByName,
	EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT,
	EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE,
	EQUIPO_DOCUMENTS_CARD_SCOPE,
	expectDocumentReviewBarSubmitName,
	openEquipoApplicationActions,
	selectDocumentDecisionInRow,
	submitEquipoDocumentReviewForm,
	typeDocumentRejectionReasonInRow,
} from '../helpers/equipo-document-review'
import {
	findTableRow,
	mainDataTable,
	selectRadix,
} from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	adminForReview,
	agentForReview,
	applicantA3,
	applicantForReview,
	applicantForReviewD,
} from './applications-review.fixtures'

registerDbSpecGuards()

const agentEmail = agentForReview.email
const applicantEmail = applicantForReview.email

test.describe('Requests agents', () => {
	let seed: SeedApplicationsReviewResult

	test.beforeEach(async () => {
		seed = await seedApplicationsReview()
	})

	test.afterEach(async () => {
		await cleanupApplicationsReview({ termId: seed.termId })
	})

	test.describe('Agent with company selected', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, agentEmail)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test.describe('Document review (requests queue)', () => {
			test('shows empty documents state when application has no documents', async ({
				page,
			}) => {
				await page.goto(`/equipo/applications/${seed.applicantA4ApplicationId}`)
				await assertEquipoApplicationDetailLoaded(page)
				const main = page.getByRole('main')
				await expect(main.getByText(/documentos/i).first()).toBeVisible()
				await expect(main.getByText(/no hay documentos/i).first()).toBeVisible()
				await expect(main.locator('input[name="file"]')).toHaveCount(0)
			})

			test('shows documents section read-only with list and no upload form', async ({
				page,
			}) => {
				await insertApplicationDocument({
					applicationId: seed.applicantA4ApplicationId,
					documentType: 'official-id',
					fileName: 'official-id-readonly-e2e.pdf',
					storageKey: 'application-documents/e2e-official-id-readonly.pdf',
				})
				await page.goto(`/equipo/applications/${seed.applicantA4ApplicationId}`)
				await assertEquipoApplicationDetailLoaded(page)
				const main = page.getByRole('main')
				await expect(main.getByText(/documentos/i).first()).toBeVisible()
				await expect(
					main.getByText(/identificación oficial/i).first(),
				).toBeVisible()
				await expect(
					main.getByText('official-id-readonly-e2e.pdf'),
				).toBeVisible()
				await expect(main.locator('input[name="file"]')).toHaveCount(0)
			})

			test('persists a single document approval while intake and application stay pending', async ({
				page,
			}) => {
				await insertApplicationDocument({
					applicationId: seed.applicantA4ApplicationId,
					documentType: 'bank-statement',
					fileName: 'bank-approve-e2e.pdf',
					storageKey: 'application-documents/e2e-bank-approve.pdf',
				})
				await page.goto(`/equipo/applications/${seed.applicantA4ApplicationId}`)
				await assertEquipoApplicationDetailLoaded(page)
				await selectDocumentDecisionInRow(
					page,
					'bank-approve-e2e.pdf',
					'approve',
				)
				await expectDocumentReviewBarSubmitName(
					page,
					/guardar cambios en documentos/i,
				)
				await submitEquipoDocumentReviewForm(page)
				await assertEquipoDocumentRowStatus(
					page,
					'bank-approve-e2e.pdf',
					'approved',
				)
				await assertEquipoApplicationShowsAppStatus(page, /pendiente/i)
			})

			test('shows validation error when agent submits reject without reason', async ({
				page,
			}) => {
				await insertApplicationDocument({
					applicationId: seed.applicantA4ApplicationId,
					documentType: 'proof-of-address',
					fileName: 'reject-validation-e2e.pdf',
					storageKey: 'application-documents/e2e-reject-validation.pdf',
				})
				await page.goto(`/equipo/applications/${seed.applicantA4ApplicationId}`)
				await assertEquipoApplicationDetailLoaded(page)
				await selectDocumentDecisionInRow(
					page,
					'reject-validation-e2e.pdf',
					'reject',
				)
				await submitEquipoDocumentReviewForm(page)
				await expect(
					page.getByText('El motivo de rechazo es obligatorio'),
				).toBeVisible()
			})

			test('shows rejected state and reason when agent rejects with reason', async ({
				page,
			}) => {
				const reason = 'Documento ilegible en la página 2'
				await insertApplicationDocument({
					applicationId: seed.applicantA4ApplicationId,
					documentType: 'official-id',
					fileName: 'reject-with-reason-e2e.pdf',
					storageKey: 'application-documents/e2e-reject-reason.pdf',
				})
				await page.goto(`/equipo/applications/${seed.applicantA4ApplicationId}`)
				await assertEquipoApplicationDetailLoaded(page)
				await selectDocumentDecisionInRow(
					page,
					'reject-with-reason-e2e.pdf',
					'reject',
				)
				await typeDocumentRejectionReasonInRow(
					page,
					'reject-with-reason-e2e.pdf',
					reason,
				)
				await submitEquipoDocumentReviewForm(page)
				await expect(
					page
						.locator('[data-sonner-toast][data-type="success"]')
						.getByText(/cambios en documentos guardados/i),
				).toBeVisible()
				await assertEquipoDocumentRowStatus(
					page,
					'reject-with-reason-e2e.pdf',
					'rejected',
					reason,
				)
			})

			test('allows agent to reject a document then approve it again', async ({
				page,
			}) => {
				const rejectReason = 'Rechazado por error'
				await insertApplicationDocument({
					applicationId: seed.applicantA4ApplicationId,
					documentType: 'bank-statement',
					fileName: 'deny-then-approve-e2e.pdf',
					storageKey: 'application-documents/e2e-deny-approve.pdf',
				})
				await page.goto(`/equipo/applications/${seed.applicantA4ApplicationId}`)
				await assertEquipoApplicationDetailLoaded(page)
				await selectDocumentDecisionInRow(
					page,
					'deny-then-approve-e2e.pdf',
					'reject',
				)
				await typeDocumentRejectionReasonInRow(
					page,
					'deny-then-approve-e2e.pdf',
					rejectReason,
				)
				await submitEquipoDocumentReviewForm(page)
				await assertEquipoDocumentRowStatus(
					page,
					'deny-then-approve-e2e.pdf',
					'rejected',
				)
				await selectDocumentDecisionInRow(
					page,
					'deny-then-approve-e2e.pdf',
					'approve',
				)
				await submitEquipoDocumentReviewForm(page)
				await assertEquipoDocumentRowStatus(
					page,
					'deny-then-approve-e2e.pdf',
					'approved',
				)
			})
		})

		test('shows applications list with table', async ({ page }) => {
			await page.goto('/equipo/applications')
			const table = mainDataTable(page)
			await expect(table).toBeVisible()
			const t = table.filter({ hasText: 'Solicitante' })
			await expect(
				t.getByRole('columnheader', { name: /solicitante/i }),
			).toBeVisible()
			await expect(
				t.getByRole('columnheader', { name: /monto/i }),
			).toBeVisible()
			await expect(
				t.getByRole('columnheader', { name: /plazo/i }),
			).toBeVisible()
			await expect(
				t.getByRole('columnheader', { name: /estado/i }),
			).toBeVisible()
			await expect(
				t.getByRole('columnheader', { name: /fecha/i }),
			).toBeVisible()
			await expect(
				t.getByRole('columnheader', { name: /acciones/i }),
			).toBeVisible()
			await expect(
				page.getByText(applicantForReview.name).first(),
			).toBeVisible()
		})

		test('shows pending applications in the requests queue', async ({
			page,
		}) => {
			await page.goto('/equipo/applications')
			await expect(mainDataTable(page)).toBeVisible()
			const count = await mainDataTable(page).locator('tbody tr').count()
			expect(count).toBeGreaterThanOrEqual(2)
			await expect(page.getByText(/pendiente/i).first()).toBeVisible()
		})

		test('Revisar link targets application detail with expected data', async ({
			page,
		}) => {
			const detailPath = `/equipo/applications/${seed.applicationId}`
			await page.goto('/equipo/applications')
			await expect(mainDataTable(page)).toBeVisible()
			const linkRow = findTableRow(page, '25,000')
			await linkRow.scrollIntoViewIfNeeded()
			const a = linkRow.getByLabel('Revisar solicitud')
			await expect(a).toHaveAttribute('href', detailPath)
			await page.goto(detailPath)
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			await expect(page.getByText(applicantEmail).first()).toBeVisible()
			await expect(page.getByText('25,000').first()).toBeVisible()
		})

		test('keeps Solicitudes active on application detail routes', async ({
			page,
		}) => {
			await page.goto(`/equipo/applications/${seed.applicationId}`)
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			const nav = page.getByRole('navigation', { name: 'Navegación' })
			await expect(
				nav.getByRole('link', { name: /^Solicitudes$/i }),
			).toHaveAttribute('data-active', 'true')
		})

		test('filter by status with no results shows empty state', async ({
			page,
		}) => {
			await page.goto('/equipo/applications?status=authorized')
			await expect(page.getByRole('main')).toBeVisible()
			await expect(
				page.getByRole('main').locator('#applications-status-filter').first(),
			).toContainText('Autorizado', { timeout: 10_000 })
			await expect(
				page.getByText(/no hay solicitudes|sin resultados/i).first(),
			).toBeVisible()
		})

		test('reject requires reason', async ({ page }) => {
			const detailPath = `/equipo/applications/${seed.applicantA2ApplicationId}`
			await page.goto('/equipo/applications')
			await expect(mainDataTable(page)).toBeVisible()
			const linkRow = findTableRow(page, '30,000')
			await linkRow.scrollIntoViewIfNeeded()
			await expect(linkRow.getByLabel('Revisar solicitud')).toHaveAttribute(
				'href',
				detailPath,
			)
			await page.goto(detailPath)
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			await openEquipoApplicationActions(page)
			await page.getByRole('menuitem', { name: /rechazar/i }).click()
			const dialog = page.getByRole('dialog')
			await dialog.locator('textarea[name="reason"]').fill(' ')
			await dialog.getByRole('button', { name: /confirmar/i }).click()
			await expect(
				dialog.getByText('El motivo es obligatorio al rechazar'),
			).toBeVisible()
		})

		test('can reject with reason', async ({ page }) => {
			const detailPath = `/equipo/applications/${seed.applicantA2ApplicationId}`
			await page.goto('/equipo/applications')
			await expect(mainDataTable(page)).toBeVisible()
			const linkRow = findTableRow(page, '30,000')
			await linkRow.scrollIntoViewIfNeeded()
			await expect(linkRow.getByLabel('Revisar solicitud')).toHaveAttribute(
				'href',
				detailPath,
			)
			await page.goto(detailPath)
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			await openEquipoApplicationActions(page)
			await page.getByRole('menuitem', { name: /rechazar/i }).click()
			const dialog = page.getByRole('dialog')
			await dialog
				.locator('textarea[name="reason"]')
				.fill('Documentación incompleta en E2E.')
			await dialog.getByRole('button', { name: /confirmar/i }).click()
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			await expect(page.getByText(/denegado/i).first()).toBeVisible()
		})

		test('can reject a document while the application stays pending', async ({
			page,
		}) => {
			await insertApplicationDocument({
				applicationId: seed.applicantA3ApplicationId,
				documentType: 'proof-of-address',
				fileName: 'e2e-40k-reject-doc.pdf',
				storageKey: 'application-documents/e2e-40k-reject-doc.pdf',
			})
			await page.goto(`/equipo/applications/${seed.applicantA3ApplicationId}`)
			await assertEquipoApplicationDetailLoaded(page)
			await assertEquipoApplicationShowsAppStatus(page, /pendiente/i)
			await selectDocumentDecisionInRow(
				page,
				'e2e-40k-reject-doc.pdf',
				'reject',
			)
			await typeDocumentRejectionReasonInRow(
				page,
				'e2e-40k-reject-doc.pdf',
				'E2E document rejected',
			)
			await submitEquipoDocumentReviewForm(page)
			await assertEquipoDocumentRowStatus(
				page,
				'e2e-40k-reject-doc.pdf',
				'rejected',
			)
			await assertEquipoApplicationShowsAppStatus(page, /pendiente/i)
		})

		test('with full intake on file, agent can approve two documents and reject one; application stays pending', async ({
			page,
		}) => {
			const appId = seed.applicationId
			const intakeRows = [
				{
					documentType: 'official-id' as const,
					fileName: 'e2e-intake-mixed-ine.pdf',
					storageKey: 'application-documents/e2e-intake-mixed-ine.pdf',
				},
				{
					documentType: 'proof-of-address' as const,
					fileName: 'e2e-intake-mixed-address.pdf',
					storageKey: 'application-documents/e2e-intake-mixed-address.pdf',
				},
				{
					documentType: 'bank-statement' as const,
					fileName: 'e2e-intake-mixed-bank.pdf',
					storageKey: 'application-documents/e2e-intake-mixed-bank.pdf',
				},
			]
			for (const row of intakeRows) {
				await insertApplicationDocument({
					applicationId: appId,
					documentType: row.documentType,
					fileName: row.fileName,
					storageKey: row.storageKey,
				})
			}
			const rejectReason = 'Estado de cuenta ilegible (E2E)'
			await page.goto(`/equipo/applications/${appId}`)
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			await assertEquipoApplicationShowsAppStatus(page, /pendiente/i)
			await selectDocumentDecisionInRow(
				page,
				'e2e-intake-mixed-ine.pdf',
				'approve',
			)
			await selectDocumentDecisionInRow(
				page,
				'e2e-intake-mixed-address.pdf',
				'approve',
			)
			await selectDocumentDecisionInRow(
				page,
				'e2e-intake-mixed-bank.pdf',
				'reject',
			)
			await typeDocumentRejectionReasonInRow(
				page,
				'e2e-intake-mixed-bank.pdf',
				rejectReason,
			)
			await clickEquipoDocumentReviewSubmitByName(page, /solicitar cambios/i)
			await assertEquipoDocumentRowStatus(
				page,
				'e2e-intake-mixed-ine.pdf',
				'approved',
			)
			await assertEquipoDocumentRowStatus(
				page,
				'e2e-intake-mixed-address.pdf',
				'approved',
			)
			await assertEquipoDocumentRowStatus(
				page,
				'e2e-intake-mixed-bank.pdf',
				'rejected',
				rejectReason,
			)
			await assertEquipoApplicationShowsAppStatus(page, /pendiente/i)
		})

		test('changes status from pending to approved on re-review via document form', async ({
			page,
		}) => {
			const appId = seed.applicantA5ApplicationId
			const intakeRows = [
				{
					documentType: 'official-id' as const,
					fileName: 'e2e-a5-re-review-ine.pdf',
					storageKey: 'application-documents/e2e-a5-re-review-ine.pdf',
				},
				{
					documentType: 'proof-of-address' as const,
					fileName: 'e2e-a5-re-review-address.pdf',
					storageKey: 'application-documents/e2e-a5-re-review-address.pdf',
				},
				{
					documentType: 'bank-statement' as const,
					fileName: 'e2e-a5-re-review-bank.pdf',
					storageKey: 'application-documents/e2e-a5-re-review-bank.pdf',
				},
			]
			for (const row of intakeRows) {
				await insertApplicationDocument({
					applicationId: appId,
					documentType: row.documentType,
					fileName: row.fileName,
					storageKey: row.storageKey,
				})
			}
			await page.goto(`/equipo/applications/${appId}`)
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			await expect(page.getByText(/pendiente/i).first()).toBeVisible()
			await selectDocumentDecisionInRow(
				page,
				'e2e-a5-re-review-ine.pdf',
				'approve',
			)
			await selectDocumentDecisionInRow(
				page,
				'e2e-a5-re-review-address.pdf',
				'approve',
			)
			await selectDocumentDecisionInRow(
				page,
				'e2e-a5-re-review-bank.pdf',
				'approve',
			)
			await clickEquipoDocumentReviewSubmitByName(page, /guardar y aprobar/i)
			await assertEquipoDocumentRowStatus(
				page,
				'e2e-a5-re-review-ine.pdf',
				'approved',
			)
			await assertEquipoDocumentRowStatus(
				page,
				'e2e-a5-re-review-address.pdf',
				'approved',
			)
			await assertEquipoDocumentRowStatus(
				page,
				'e2e-a5-re-review-bank.pdf',
				'approved',
			)
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			await expect(page.getByText(/aprobada/i).first()).toBeVisible()
		})

		test('requests agent sees only deny in actions menu when the application has documents', async ({
			page,
		}) => {
			const menuProbeFileName = 'e2e-a3-actions-menu-only-deny.pdf'
			await insertApplicationDocument({
				applicationId: seed.applicantA3ApplicationId,
				documentType: 'official-id',
				fileName: menuProbeFileName,
				storageKey: `application-documents/${seed.applicantA3ApplicationId}/official-id/${menuProbeFileName}`,
			})
			await page.goto(`/equipo/applications/${seed.applicantA3ApplicationId}`)
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			await assertEquipoApplicationShowsAppStatus(page, /pendiente/i)
			const card = page.locator(EQUIPO_DOCUMENTS_CARD_SCOPE).first()
			await expect(card).toBeVisible()
			await expect(card).toContainText(menuProbeFileName)
			await openEquipoApplicationActions(page)
			await expect(
				page.getByRole('menuitem', { name: /rechazar/i }),
			).toBeVisible()
			await expect(
				page.getByRole('menuitem', { name: /aprobar/i }),
			).toHaveCount(0)
		})

		test('filter by status shows matching applications', async ({ page }) => {
			await page.goto('/equipo/applications')
			await expect(mainDataTable(page)).toBeVisible()
			await selectRadix(page, 'status', 'Pendiente')
			await expect(
				page.getByRole('main').locator('#applications-status-filter').first(),
			).toContainText('Pendiente')
			const tr = mainDataTable(page).locator('tbody tr')
			await expect(tr.first()).toBeVisible()
			const n = await tr.count()
			expect(n).toBeGreaterThanOrEqual(1)
			await expect(page.getByText(applicantA3.name).first()).toBeVisible()
		})

		test('invalid application id shows not found', async ({ page }) => {
			await page.goto('/equipo/applications/999999')
			await expect(
				page
					.getByText(/404|not found|página no encontrada|could not be found/i)
					.first(),
			).toBeVisible()
		})

		test('application from another company returns 404', async ({ page }) => {
			await page.goto(`/equipo/applications/${seed.companyBApplicationId}`)
			await expect(
				page
					.getByText(/404|not found|página no encontrada|could not be found/i)
					.first(),
			).toBeVisible()
		})

		test.describe('Cross-role access (requests vs authorization stage)', () => {
			test('hides application actions and document decisions on awaiting-authorization', async ({
				page,
			}) => {
				await page.goto(`/equipo/applications/${seed.authzApplicationId}`)
				await assertEquipoApplicationShowsAppStatus(
					page,
					/en revisión de autorización/i,
				)
				await expect(
					page
						.locator('[aria-labelledby="equipo-application-detail-title"]')
						.getByRole('button', { name: /acciones/i }),
				).toHaveCount(0)
				await expect(
					page.locator(`${EQUIPO_DOCUMENTS_CARD_SCOPE} ul > li`),
				).toHaveCount(EQUIPO_AUTHZ_STAGE_TOTAL_DOCUMENT_ROW_COUNT)
				const card = page.locator(EQUIPO_DOCUMENTS_CARD_SCOPE).first()
				const approve = card.locator('button[aria-label^="Aprobar"]')
				const reject = card.locator('button[aria-label^="Rechazar"]')
				for (let i = 0; i < (await approve.count()); i++) {
					await expect(approve.nth(i)).toHaveAttribute('aria-disabled', 'true')
				}
				for (let i = 0; i < (await reject.count()); i++) {
					await expect(reject.nth(i)).toHaveAttribute('aria-disabled', 'true')
				}
			})
		})
	})

	test.describe('Agent with no company selected', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, agentEmail)
			await page.goto('/equipo')
			await clearSelectedCompanyIdCookie(page)
			await page.goto('/equipo/applications')
			await expect(mainDataTable(page)).toBeVisible()
		})

		test('shows applications from all assigned companies (multi scope)', async ({
			page,
		}) => {
			await expect(page.getByText('reviewcompany.com').first()).toBeVisible()
			await expect(page.getByText('othercompany.com').first()).toBeVisible()
			await expect(page.getByText('adminonly.com')).toHaveCount(0)
		})

		test('picking a company from switcher filters the list', async ({
			page,
		}) => {
			await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(10)
			await page.locator('#company-switcher-trigger').click()
			await page.getByRole('menuitem', { name: 'Other Company' }).click()
			await expect(page.locator('#company-switcher-trigger')).toContainText(
				'Other Company',
			)
			await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(1)
			await expect(page.getByText('othercompany.com').first()).toBeVisible()
			await expect(findTableRow(page, '15,000')).toBeVisible()
		})
	})

	test.describe('Inactive company', () => {
		test('cookie with inactive company falls back to all-assigned view', async ({
			page,
		}) => {
			await loginPage(page, agentEmail)
			await page.goto('/equipo')
			await setSelectedCompanyId(page, seed.companyDId)
			await page.goto('/equipo/applications')
			await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(10)
			await expect(page.getByText('inactivecompany.com')).toHaveCount(0)
			await expect(page.locator('#company-switcher-trigger')).toContainText(
				'Todas mis empresas',
			)
		})

		test('inactive company not in picker', async ({ page }) => {
			await loginPage(page, agentEmail)
			await page.goto('/equipo')
			await clearSelectedCompanyIdCookie(page)
			await page.goto('/equipo/applications')
			await page.locator('#company-switcher-trigger').click()
			const menu = page.getByRole('menu')
			await expect(menu).toBeVisible()
			await expect(
				menu.getByRole('menuitem', { name: 'Inactive Company' }),
			).toHaveCount(0)
		})

		test('applications from inactive company hidden from list', async ({
			page,
		}) => {
			await loginPage(page, agentEmail)
			await page.goto('/equipo')
			await clearSelectedCompanyIdCookie(page)
			await page.goto('/equipo/applications')
			await expect(page.getByText('inactivecompany.com')).toHaveCount(0)
			await expect(mainDataTable(page)).not.toContainText(
				applicantForReviewD.name,
			)
		})
	})
})

test.describe('Requests admin', () => {
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

	test('can approve all intake documents and move application to approved (happy path)', async ({
		page,
	}) => {
		const appId = seed.applicationId
		const intakeRows = [
			{
				documentType: 'official-id' as const,
				fileName: 'e2e-admin-requests-intake-ine.pdf',
				storageKey: 'application-documents/e2e-admin-requests-intake-ine.pdf',
			},
			{
				documentType: 'proof-of-address' as const,
				fileName: 'e2e-admin-requests-intake-address.pdf',
				storageKey:
					'application-documents/e2e-admin-requests-intake-address.pdf',
			},
			{
				documentType: 'bank-statement' as const,
				fileName: 'e2e-admin-requests-intake-bank.pdf',
				storageKey: 'application-documents/e2e-admin-requests-intake-bank.pdf',
			},
		]
		for (const row of intakeRows) {
			await insertApplicationDocument({
				applicationId: appId,
				documentType: row.documentType,
				fileName: row.fileName,
				storageKey: row.storageKey,
			})
		}
		await page.goto(`/equipo/applications/${appId}`)
		await expect(
			page.getByRole('heading', { name: /detalle de solicitud/i }),
		).toBeVisible()
		await assertEquipoApplicationShowsAppStatus(page, /pendiente/i)
		await selectDocumentDecisionInRow(
			page,
			'e2e-admin-requests-intake-ine.pdf',
			'approve',
		)
		await selectDocumentDecisionInRow(
			page,
			'e2e-admin-requests-intake-address.pdf',
			'approve',
		)
		await selectDocumentDecisionInRow(
			page,
			'e2e-admin-requests-intake-bank.pdf',
			'approve',
		)
		await page
			.locator(EQUIPO_DETAIL_DOCUMENTS_REVIEW_SCOPE)
			.locator('.border-t.pt-4')
			.getByRole('button', { name: /guardar y aprobar/i })
			.click()
		await assertEquipoDocumentRowStatus(
			page,
			'e2e-admin-requests-intake-ine.pdf',
			'approved',
		)
		await assertEquipoDocumentRowStatus(
			page,
			'e2e-admin-requests-intake-address.pdf',
			'approved',
		)
		await assertEquipoDocumentRowStatus(
			page,
			'e2e-admin-requests-intake-bank.pdf',
			'approved',
		)
		await expect(
			page.getByRole('heading', { name: /detalle de solicitud/i }),
		).toBeVisible()
		await expect(page.getByText(/aprobada/i).first()).toBeVisible()
	})
})
