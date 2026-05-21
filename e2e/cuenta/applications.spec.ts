import { expect, type Page, test } from '@playwright/test'
import { adminUser } from '~/e2e/admin/companies.fixtures'
import type { SeedCuentaApplicationsResult } from '~/e2e/server/tasks'
import {
	cleanupCuentaApplications,
	deleteApplicationsByApplicantId,
	deleteUsersByEmail,
	getUserIdByEmail,
	insertApplicationDocument,
	resetApplicantApplication,
	resetCompany,
	resetUser,
	seedCuentaApplications,
	seedPreAuthorizedPackageDocuments,
	updateLatestApplicationDocumentByType,
} from '~/e2e/server/tasks'
import { loginPage } from '../helpers/auth'
import {
	applicationDocumentSlot,
	DOCUMENT_UPLOAD_STATUS,
	expectInitialIntakeDocumentsPendingOnDetail,
	postToCuentaApplicationUrl,
	SAMPLE_DOCUMENT_WEBP,
	uploadDocumentViaFileInput,
	waitForPostToCuentaApplications,
	waitForSuccessfulPost,
} from '../helpers/document-upload'
import { selectRadix } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	applicantB,
	applicantInactiveCompany,
	applicantNoCompany,
	applicantWithCompany,
	applicantWithCompanyWithoutCapacityRate,
	applicantWithCompanyWithoutTermOfferings,
	companyWithTerms,
} from './applications.fixtures'

registerDbSpecGuards()

const cuentaMain = (page: Page) => page.getByRole('main')

const initialApplicationDocumentTypes = [
	'official-id',
	'proof-of-address',
	'bank-statement',
] as const

test.describe('Cuenta applications', () => {
	let seed: SeedCuentaApplicationsResult

	test.beforeAll(async () => {
		seed = await seedCuentaApplications()
	})

	test.afterAll(async () => {
		await cleanupCuentaApplications({ termId: seed.termId })
	})

	test.describe('Applicant entry redirect', () => {
		test('applicant with no applications visiting /cuenta redirects to new application page', async ({
			page,
		}) => {
			await deleteApplicationsByApplicantId(seed.applicantId)
			await loginPage(page, applicantWithCompany.email)
			await page.goto('/cuenta')
			await expect(
				page.getByRole('heading', { name: /nueva solicitud de crédito/i }),
			).toBeVisible()
			await expect(
				cuentaMain(page)
					.getByText(
						/completa la información|información personal y financiera|salario|rfc|clabe/i,
					)
					.first(),
			).toBeVisible()
		})

		test('applicant with at least one application visiting /cuenta stays on cuenta home', async ({
			page,
		}) => {
			await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			})
			await loginPage(page, applicantWithCompany.email)
			await page.goto('/cuenta')
			await expect(
				page.getByRole('heading', { name: /resumen ejecutivo/i }),
			).toBeVisible()
			await expect(
				page.getByRole('heading', { name: /nueva solicitud de crédito/i }),
			).toHaveCount(0)
			await expect(
				page
					.getByRole('link', { name: /solicitar ahora|preaprobado/i })
					.first(),
			).toBeVisible()
		})
	})

	test.describe('Access Control', () => {
		test('allows applicant to open applications list and new application page', async ({
			page,
		}) => {
			await loginPage(page, applicantWithCompany.email)
			await page.goto('/cuenta/applications')
			await expect(
				page.getByRole('heading', { name: /mis solicitudes/i }),
			).toBeVisible()

			await page.goto('/cuenta/applications/new')
			await expect(
				page.getByRole('heading', { name: /nueva solicitud de crédito/i }),
			).toBeVisible()
		})

		test('redirects non-applicant (agent) to unauthorized', async ({
			page,
		}) => {
			const agent = {
				name: 'Agent For Applications Test',
				email: 'agent.applications@example.com',
				roles: ['agent', 'requests'] as const,
			}
			await resetUser({
				name: agent.name,
				email: agent.email,
				roles: [...agent.roles],
			})
			await loginPage(page, agent.email)
			await page.goto('/cuenta/applications')
			await expect(
				page.getByRole('heading', { name: /403|no autorizado/i }),
			).toBeVisible()

			await deleteUsersByEmail([agent.email])
		})
	})

	test.describe('Email-domain validation', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, applicantNoCompany.email)
			await page.goto('/cuenta/applications/new')
		})

		test('applicant whose domain matches no company is redirected to unauthorized when visiting applications/new', async ({
			page,
		}) => {
			await expect(
				page.getByRole('heading', { name: /403|no autorizado/i }),
			).toBeVisible()
		})
	})

	test.describe('Active company missing borrowing capacity rate', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, applicantWithCompanyWithoutCapacityRate.email)
			await page.goto('/cuenta/applications/new')
		})

		test('applicant can still open the new application page', async ({
			page,
		}) => {
			await expect(
				page.getByRole('heading', { name: /nueva solicitud de crédito/i }),
			).toBeVisible()
			await expect(
				cuentaMain(page)
					.getByText(
						/completa la información|información personal y financiera|salario|rfc|clabe/i,
					)
					.first(),
			).toBeVisible()
		})
	})

	test.describe('Active company without term offerings', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, applicantWithCompanyWithoutTermOfferings.email)
			await page.goto('/cuenta/applications/new')
		})

		test('applicant can still open the new application page', async ({
			page,
		}) => {
			await expect(
				page.getByRole('heading', { name: /nueva solicitud de crédito/i }),
			).toBeVisible()
			await expect(
				cuentaMain(page)
					.getByText(
						/completa la información|información personal y financiera|salario|rfc|clabe/i,
					)
					.first(),
			).toBeVisible()
		})
	})

	test.describe('Inactive company', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, applicantInactiveCompany.email)
			await page.goto('/cuenta/applications/new')
		})

		test('applicant whose company is inactive is redirected to unauthorized', async ({
			page,
		}) => {
			await expect(
				page.getByRole('heading', { name: /403|no autorizado/i }),
			).toBeVisible()
		})
	})

	test.describe('Registration guard', () => {
		test('signup with email domain that matches no valid company shows error and does not create account', async ({
			page,
		}) => {
			const badEmail = 'neworphan@nocompany.org'
			await deleteUsersByEmail([badEmail])
			await page.goto('/signup')
			await page.locator('input[name="email"]').fill(badEmail)
			await page.locator('input[name="name"]').fill('Test Orphan')
			await page
				.getByRole('button', { name: /regístrate|registrarse/i })
				.scrollIntoViewIfNeeded()
			await expect(
				page.getByRole('button', { name: /regístrate|registrarse/i }),
			).toBeVisible()
			await page
				.getByRole('button', { name: /regístrate|registrarse/i })
				.click()
			await expect(
				page.getByRole('heading', { name: /bienvenido a topcredit/i }),
			).toBeVisible()
			await expect(
				page.getByText(/Tu correo no está asociado.*No puedes registrarte/i),
			).toBeVisible()
			const id = await getUserIdByEmail(badEmail)
			expect(id).toBeNull()

			await deleteUsersByEmail([badEmail])
		})
	})

	test.describe('Form validation', () => {
		test('shows detected bank name from CLABE prefix', async ({ page }) => {
			await loginPage(page, applicantWithCompany.email)
			await page.goto('/cuenta/applications/new')
			await page.locator('input[name="clabe"]').fill('014580569257722968')
			await expect(
				page.getByText(/Banco detectado:\s*SANTANDER/i),
			).toBeVisible()
		})

		test('submitting with empty required fields shows field errors', async ({
			page,
		}) => {
			await loginPage(page, applicantWithCompany.email)
			await page.goto('/cuenta/applications/new')
			const submit = page.getByRole('button', { name: /solicitar ahora/i })
			await submit.scrollIntoViewIfNeeded()
			await expect(submit).toBeVisible()
			await submit.click()
			await expect(
				page.getByRole('heading', { name: /nueva solicitud de crédito/i }),
			).toBeVisible()
			await expect(
				cuentaMain(page).getByText('El valor es requerido').first(),
			).toBeVisible()
		})

		test('submitting with invalid RFC date/check digit and CLABE checksum shows errors', async ({
			page,
		}) => {
			await loginPage(page, applicantWithCompany.email)
			await page.goto('/cuenta/applications/new')
			await page.locator('input[name="salaryAtApplication"]').fill('100000')
			await page
				.locator('select[name="salaryFrequency"]')
				.selectOption('monthly')
			await page.locator('input[name="payrollNumber"]').fill('12345')
			await page.locator('input[name="rfc"]').fill('ABCD991332ABC')
			await page.locator('input[name="clabe"]').fill('032180000118359718')
			await page
				.locator('input[name="streetAndNumber"]')
				.fill('Av. Siempre Viva 742')
			await page.locator('input[name="city"]').fill('Monterrey')
			await selectRadix(page, 'label:Estado', 'Nuevo León')
			await page.locator('input[name="postalCode"]').fill('6400')
			await page.locator('input[name="phoneNumber"]').fill('8112345678')
			const submit = page.getByRole('button', { name: /solicitar ahora/i })
			await submit.scrollIntoViewIfNeeded()
			await expect(submit).toBeVisible()
			await submit.click()
			await expect(
				page.getByRole('heading', { name: /nueva solicitud de crédito/i }),
			).toBeVisible()
			await expect(
				cuentaMain(page).getByText(/RFC no es válido/i),
			).toBeVisible()
			await expect(
				cuentaMain(page).getByText(/CLABE no es válida/i),
			).toBeVisible()
			await expect(
				cuentaMain(page).getByText(/código postal.*5/i),
			).toBeVisible()
		})
	})

	test.describe('Isolation', () => {
		test('applicant cannot see another applicant applications', async ({
			page,
		}) => {
			await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '50000',
				salaryAtApplication: '200000',
			})
			await loginPage(page, applicantB.email)
			await page.goto('/cuenta/applications')
			await expect(
				cuentaMain(page).getByText(
					/no tienes solicitudes|no hay solicitudes|solicitudes de crédito/i,
				),
			).toBeVisible()
			await expect(page.locator('body')).not.toContainText('50,000')
		})
	})

	test.describe('Status overview', () => {
		test('shows empty state when applicant has no applications', async ({
			page,
		}) => {
			await deleteApplicationsByApplicantId(seed.applicantId)
			await loginPage(page, applicantWithCompany.email)
			await page.goto('/cuenta/applications')
			await expect(
				cuentaMain(page)
					.getByText(/no tienes solicitudes|no hay solicitudes|solicitudes/i)
					.first(),
			).toBeVisible()
		})

		test('shows list with one application after creating one', async ({
			page,
		}) => {
			await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '25000',
				salaryAtApplication: '100000',
			})
			await loginPage(page, applicantWithCompany.email)
			await page.goto('/cuenta/applications')
			await expect(page.getByText('25,000')).toBeVisible()
		})
	})

	test.describe('Submit application', () => {
		test('applicant can submit an application and see it in the list', async ({
			page,
		}) => {
			await deleteApplicationsByApplicantId(seed.applicantId)
			await loginPage(page, applicantWithCompany.email)
			await page.goto('/cuenta/applications/new')

			await expect(
				page.getByRole('heading', { name: /documentos requeridos/i, level: 2 }),
			).toBeVisible()
			await expect(
				page.locator('input[name="applicationId"]').first(),
			).toHaveValue(/^\d+$/)
			for (const documentType of initialApplicationDocumentTypes) {
				const slot = applicationDocumentSlot(page, documentType)
				await expect(slot).toBeVisible()
				await expect(slot.getByText(/sin cargar/i)).toBeVisible()
			}

			await page.locator('input[name="salaryAtApplication"]').fill('100000')
			await page
				.locator('select[name="salaryFrequency"]')
				.selectOption('monthly')
			await page.locator('input[name="payrollNumber"]').fill('EMP-001')
			await page.locator('input[name="rfc"]').fill('GODE561231GR8')
			await page.locator('input[name="clabe"]').fill('032180000118359719')
			await page
				.locator('input[name="streetAndNumber"]')
				.fill('Av. Revolucion 123')
			await page.locator('input[name="interiorNumber"]').fill('1206 Torre 4')
			await page.locator('input[name="city"]').fill('Monterrey')
			await selectRadix(page, 'label:Estado', 'Nuevo León')
			await page.locator('input[name="postalCode"]').fill('64000')
			await page.locator('input[name="phoneNumber"]').fill('8112345678')

			for (const documentType of initialApplicationDocumentTypes) {
				const slot = applicationDocumentSlot(page, documentType)
				await uploadDocumentViaFileInput({
					page,
					container: slot,
					fileInput: slot.locator('input[name="file"]'),
					postPattern: /\/cuenta\/applications/,
					statusPattern: DOCUMENT_UPLOAD_STATUS.pendingReview,
				})
			}

			const submitPromise = waitForPostToCuentaApplications(page)
			const submit = page.getByRole('button', { name: /solicitar ahora/i })
			await submit.scrollIntoViewIfNeeded()
			await expect(submit).toBeVisible()
			await submit.click()
			await submitPromise

			await expect(
				page.getByRole('heading', { name: /mis solicitudes/i }),
			).toBeVisible()
			await expect(cuentaMain(page)).toBeVisible()
			await expect(
				cuentaMain(page)
					.getByText(/nueva solicitud/i)
					.first(),
			).toBeVisible()
			await expect(
				cuentaMain(page)
					.getByText(/por definir/i)
					.first(),
			).toBeVisible()

			const detailLink = cuentaMain(page)
				.getByRole('link', { name: /ver detalle de solicitud/i })
				.first()
			await detailLink.scrollIntoViewIfNeeded()
			await detailLink.click()
			await expect(page).toHaveURL(/\/cuenta\/applications\/\d+/)
			await expect(
				page.getByRole('heading', { name: /resumen de tu solicitud/i }),
			).toBeVisible()
			await expectInitialIntakeDocumentsPendingOnDetail(page)
		})

		test('shows validation errors when required documents are missing', async ({
			page,
		}) => {
			await deleteApplicationsByApplicantId(seed.applicantId)
			await loginPage(page, applicantWithCompany.email)
			await page.goto('/cuenta/applications/new')

			await expect(
				page.getByRole('heading', { name: /documentos requeridos/i, level: 2 }),
			).toBeVisible()

			await page.locator('input[name="salaryAtApplication"]').fill('100000')
			await page
				.locator('select[name="salaryFrequency"]')
				.selectOption('monthly')
			await page.locator('input[name="payrollNumber"]').fill('EMP-001')
			await page.locator('input[name="rfc"]').fill('GODE561231GR8')
			await page.locator('input[name="clabe"]').fill('032180000118359719')
			await page
				.locator('input[name="streetAndNumber"]')
				.fill('Av. Revolucion 123')
			await page.locator('input[name="interiorNumber"]').fill('1206 Torre 4')
			await page.locator('input[name="city"]').fill('Monterrey')
			await selectRadix(page, 'label:Estado', 'Nuevo León')
			await page.locator('input[name="postalCode"]').fill('64000')
			await page.locator('input[name="phoneNumber"]').fill('8112345678')

			const submitPromise = waitForPostToCuentaApplications(page)
			const submit = page.getByRole('button', { name: /solicitar ahora/i })
			await submit.scrollIntoViewIfNeeded()
			await expect(submit).toBeVisible()
			await submit.click()
			await submitPromise

			await expect(
				page.getByRole('heading', { name: /nueva solicitud de crédito/i }),
			).toBeVisible()

			for (const documentType of initialApplicationDocumentTypes) {
				const slot = applicationDocumentSlot(page, documentType)
				await expect(
					slot.getByText(/Selecciona un archivo válido\./i),
				).toBeVisible()
			}
		})
	})

	test.describe('Cuenta navigation links', () => {
		test.beforeEach(async ({ page }) => {
			await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '10000',
				salaryAtApplication: '100000',
			})
			await loginPage(page, applicantWithCompany.email)
		})

		test('shows applicant sidebar navigation on cuenta home', async ({
			page,
		}) => {
			const nav = page.getByRole('navigation', {
				name: 'Navegación principal del portal',
			})
			await page.goto('/cuenta')
			await expect(nav).toBeVisible()
			await expect(nav.locator('a[href="/cuenta"]')).toBeVisible()
			await expect(
				nav.locator('a[href="/cuenta/applications/new"]'),
			).toBeVisible()
			await expect(nav.locator('a[href="/cuenta/applications"]')).toBeVisible()
			await expect(nav.locator('a[href="/cuenta/credits"]')).toBeVisible()
			await expect(nav.locator('a[href="/cuenta/support"]')).toBeVisible()
		})

		test('applicant can open Mis créditos placeholder page', async ({
			page,
		}) => {
			await page.goto('/cuenta/credits')
			await expect(
				cuentaMain(page)
					.getByText(/mis créditos/i)
					.first(),
			).toBeVisible()
			await expect(
				cuentaMain(page)
					.getByText(/sin créditos todavía|formalizado/i)
					.first(),
			).toBeVisible()
		})

		test('applicant can open Soporte (chat preview UI)', async ({ page }) => {
			await page.goto('/cuenta/support')
			await expect(page.getByText(/asistente topcredit/i).first()).toBeVisible()
			await expect(
				page.getByText(/preguntas frecuentes/i).first(),
			).toBeVisible()
		})

		test('Solicitar Ahora link targets new application page', async ({
			page,
		}) => {
			await page.goto('/cuenta')
			await expect(page.getByText('Resumen ejecutivo')).toBeVisible()
			const link = page.getByRole('link', { name: /solicitar ahora/i })
			await expect(link).toBeVisible()
			await expect(link).toHaveAttribute('href', '/cuenta/applications/new')
			await page.goto('/cuenta/applications/new')
			await expect(
				page.getByRole('heading', { name: /nueva solicitud de crédito/i }),
			).toBeVisible()
			await expect(
				cuentaMain(page)
					.getByText(
						/completa la información|información personal y financiera|salario|rfc|clabe/i,
					)
					.first(),
			).toBeVisible()
		})

		test('Ver Estado goes to applications list', async ({ page }) => {
			await page.goto('/cuenta')
			await expect(page.getByText('Resumen ejecutivo')).toBeVisible()
			await expect(
				page.getByRole('link', { name: /ver estado/i }),
			).toHaveAttribute('href', '/cuenta/applications')
		})

		test('Ver link on list targets detail that shows amount', async ({
			page,
		}) => {
			const creditAmount = '10000'
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount,
				salaryAtApplication: '100000',
			})
			const detailPath = `/cuenta/applications/${app.id}`
			await page.goto('/cuenta/applications')
			await expect(cuentaMain(page)).toBeVisible()
			const rowLink = cuentaMain(page).locator(`a[href="${detailPath}"]`)
			await rowLink.scrollIntoViewIfNeeded()
			await expect(rowLink).toBeVisible()
			await page.goto(detailPath)
			await expect(
				page.getByRole('heading', { name: /resumen de tu solicitud/i }),
			).toBeVisible()
			await expect(page.getByText('10,000')).toBeVisible()
			await expect(page.getByText(/monto del crédito/i)).toBeVisible()
		})
	})

	test.describe('Documents section on application detail', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, applicantWithCompany.email)
		})

		test('shows three document slots with not-uploaded state and per-slot upload', async ({
			page,
		}) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			})
			await page.goto(`/cuenta/applications/${app.id}`)
			await expect(
				page.getByRole('heading', { name: /resumen de tu solicitud/i }),
			).toBeVisible()

			const official = page.locator(
				'section[aria-labelledby="cuenta-application-doc-official-id"]',
			)
			await official.first().scrollIntoViewIfNeeded()
			await expect(official.first()).toBeVisible()
			await expect(
				official.first().getByText(/identificación oficial/i),
			).toBeVisible()
			await expect(official.first().getByText(/sin cargar/i)).toBeVisible()

			const address = page.locator(
				'section[aria-labelledby="cuenta-application-doc-proof-of-address"]',
			)
			await expect(address.getByText(/comprobante de domicilio/i)).toBeVisible()
			await expect(address.getByText(/sin cargar/i)).toBeVisible()

			const bank = page.locator(
				'section[aria-labelledby="cuenta-application-doc-bank-statement"]',
			)
			await expect(bank.getByText(/estado de cuenta bancario/i)).toBeVisible()
			await expect(bank.getByText(/sin cargar/i)).toBeVisible()

			await expect(
				official.first().getByRole('button', { name: /examinar archivos/i }),
			).toBeVisible()
			const fileInput = official.first().locator('input[name="file"]')
			await expect(fileInput).toHaveCount(1)
			await expect(fileInput).toHaveClass(/sr-only/)

			await expect(
				page.locator('label', { hasText: /tipo de documento/i }),
			).toHaveCount(0)
			await expect(page.getByRole('button', { name: /^subir$/i })).toHaveCount(
				0,
			)
		})

		test('shows pending official ID on application detail right after upload without leaving the page', async ({
			page,
		}) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			})
			await page.goto(`/cuenta/applications/${app.id}`)
			await expect(
				page.getByRole('heading', { name: /resumen de tu solicitud/i }),
			).toBeVisible()

			const official = applicationDocumentSlot(page, 'official-id')
			await official.first().scrollIntoViewIfNeeded()
			await uploadDocumentViaFileInput({
				page,
				container: official.first(),
				fileInput: official.first().locator('input[name="file"]'),
				postPattern: /\/cuenta\/applications/,
				statusPattern: DOCUMENT_UPLOAD_STATUS.pendingReview,
			})
		})

		test('shows document in list when one is seeded via DB (no real upload)', async ({
			page,
		}) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			})
			await insertApplicationDocument({
				applicationId: app.id,
				documentType: 'official-id',
				fileName: 'auth.pdf',
				storageKey: `application-documents/${app.id}/official-id/e2e-auth.pdf`,
			})
			await page.goto(`/cuenta/applications/${app.id}`)
			const official = page.locator(
				'section[aria-labelledby="cuenta-application-doc-official-id"]',
			)
			await official.first().scrollIntoViewIfNeeded()
			await expect(official.first()).toBeVisible()
			await expect(
				official.first().getByText(/identificación oficial/i),
			).toBeVisible()
			await expect(official.first().getByText(/pendiente/i)).toBeVisible()
			await expect(official.first().getByText('auth.pdf')).toBeVisible()

			await expect(
				page.locator('a[href*="/api/application-documents/"]'),
			).toHaveCount(1)
			await expect(
				page.locator('a[href*="/api/application-documents/"]').first(),
			).toBeVisible()
		})

		test('shows rejected reasons and stays pending after the last rejected doc is reuploaded', async ({
			page,
		}) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pending',
			})
			await insertApplicationDocument({
				applicationId: app.id,
				documentType: 'official-id',
				fileName: 'auth-rejected.pdf',
				storageKey: `application-documents/${app.id}/official-id/e2e-auth-rejected.pdf`,
				status: 'rejected',
				rejectionReason: 'Firma incompleta',
			})
			await insertApplicationDocument({
				applicationId: app.id,
				documentType: 'proof-of-address',
				fileName: 'payroll-rejected.pdf',
				storageKey: `application-documents/${app.id}/proof-of-address/e2e-payroll-rejected.pdf`,
				status: 'rejected',
				rejectionReason: 'Recibo ilegible',
			})

			await page.goto(`/cuenta/applications/${app.id}`)
			await expect(
				page
					.locator('[role="status"]')
					.filter({ hasText: /documentación inválida/i }),
			).toBeVisible()
			await expect(
				cuentaMain(page)
					.getByText(/documentación inválida/i)
					.first(),
			).toBeVisible()

			const historyHeading = page.getByRole('heading', {
				name: /historial de estado/i,
			})
			await expect(historyHeading).toBeVisible()

			await expect(
				cuentaMain(page)
					.getByText(/motivo de rechazo/i)
					.first(),
			).toBeVisible()
			await expect(
				cuentaMain(page)
					.getByText(/firma incompleta/i)
					.first(),
			).toBeVisible()
			await expect(
				cuentaMain(page)
					.getByText(/recibo ilegible/i)
					.first(),
			).toBeVisible()

			const historySection = historyHeading.locator(
				'xpath=ancestor::section[1]',
			)
			const listItems = historySection.locator('ol li')
			expect(await listItems.count()).toBeGreaterThanOrEqual(1)
			const firstItemText = await listItems.first().innerText()
			expect(firstItemText).toMatch(/pendiente|documentación inválida/i)

			const upload1 = waitForPostToCuentaApplications(page)
			await page
				.locator(
					'section[aria-labelledby="cuenta-application-doc-official-id"] input[name="file"]',
				)
				.setInputFiles(SAMPLE_DOCUMENT_WEBP)
			await upload1

			await page.goto(`/cuenta/applications/${app.id}`)
			await expect(
				cuentaMain(page)
					.getByText(/documentación inválida/i)
					.first(),
			).toBeVisible()
			await expect(cuentaMain(page).getByText('auth-rejected.pdf')).toHaveCount(
				0,
			)
			await expect(
				cuentaMain(page)
					.getByText(/recibo ilegible/i)
					.first(),
			).toBeVisible()

			const upload2 = waitForPostToCuentaApplications(page)
			await page
				.locator(
					'section[aria-labelledby="cuenta-application-doc-proof-of-address"] input[name="file"]',
				)
				.setInputFiles(SAMPLE_DOCUMENT_WEBP)
			await upload2

			await page.goto(`/cuenta/applications/${app.id}`)
			await expect(
				cuentaMain(page)
					.locator('[role="status"]')
					.filter({ hasText: /pendiente/i })
					.first(),
			).toBeVisible()
			await expect(
				cuentaMain(page).getByText(/motivo de rechazo:/i),
			).toHaveCount(0)

			const historyHeading2 = page.getByRole('heading', {
				name: /historial de estado/i,
			})
			const historySection2 = historyHeading2.locator(
				'xpath=ancestor::section[1]',
			)
			await expect(historySection2.locator('ol li')).toHaveCount(1)
			const lastText = await historySection2
				.locator('ol li')
				.first()
				.innerText()
			expect(lastText).toMatch(/pendiente|documentación inválida/i)
		})

		test('uploads a file and shows it in the list (real blob upload)', async ({
			page,
		}) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			})
			await page.goto(`/cuenta/applications/${app.id}`)
			await page
				.locator(
					'section[aria-labelledby="cuenta-application-doc-official-id"]',
				)
				.first()
				.scrollIntoViewIfNeeded()

			const uploadPromise = waitForPostToCuentaApplications(page)
			await page
				.locator(
					'section[aria-labelledby="cuenta-application-doc-bank-statement"] input[name="file"]',
				)
				.setInputFiles(SAMPLE_DOCUMENT_WEBP)
			await uploadPromise

			await page.goto(`/cuenta/applications/${app.id}`)
			await expect(
				cuentaMain(page)
					.getByText(/pendiente/i)
					.first(),
			).toBeVisible()
			await expect(
				cuentaMain(page).getByText('sample-document.webp'),
			).toBeVisible()
			await expect(
				cuentaMain(page).getByText(/estado de cuenta bancario/i),
			).toBeVisible()

			const href = await page
				.locator('a[href*="/api/application-documents/"]')
				.first()
				.getAttribute('href')
			expect(href).toMatch(/\/api\/application-documents\/\d+\/file$/)
		})

		test('submit without file shows validation error', async ({ page }) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			})
			await page.goto(`/cuenta/applications/${app.id}`)
			await page
				.locator(
					'section[aria-labelledby="cuenta-application-doc-official-id"] input[name="file"]',
				)
				.setInputFiles({
					name: 'empty.pdf',
					mimeType: 'application/pdf',
					buffer: Buffer.alloc(0),
				})
			await expect(
				page.getByText('Selecciona un archivo válido.'),
			).toBeVisible()
			await expect(
				page.getByRole('heading', { name: /resumen de tu solicitud/i }),
			).toBeVisible()
		})

		test('preview document returns file when authenticated (real blob)', async ({
			page,
		}) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
			})
			await page.goto(`/cuenta/applications/${app.id}`)
			await page
				.locator(
					'section[aria-labelledby="cuenta-application-doc-official-id"]',
				)
				.first()
				.scrollIntoViewIfNeeded()

			const uploadPromise = waitForPostToCuentaApplications(page)
			await page
				.locator(
					'section[aria-labelledby="cuenta-application-doc-bank-statement"] input[name="file"]',
				)
				.setInputFiles(SAMPLE_DOCUMENT_WEBP)
			await uploadPromise

			await page.goto(`/cuenta/applications/${app.id}`)
			await expect(page.getByText('sample-document.webp')).toBeVisible()

			const href = await page
				.locator('a[href*="/api/application-documents/"]')
				.first()
				.getAttribute('href')
			expect(href).toMatch(/\/api\/application-documents\/\d+\/file$/)
			if (!href) {
				throw new Error('missing document href')
			}
			const res = await page.request.get(href)
			expect(res.status()).toBe(200)
			const body = await res.body()
			expect(body.length).toBeGreaterThan(0)
			const ct = res.headers()['content-type']
			expect(ct).toContain('image/webp')
		})
	})

	test.describe('Pre-authorized authorization package', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, applicantWithCompany.email)
		})

		test('shows company template downloads after admin uploads templates', async ({
			page,
		}) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			})

			await resetUser({
				name: adminUser.name,
				email: adminUser.email,
				roles: [...adminUser.roles],
			})

			await resetCompany(companyWithTerms)

			const editPattern = /\/equipo\/companies\/.+\/edit/
			await loginPage(page, adminUser.email)
			await page.goto(
				`/equipo/companies/${encodeURIComponent(companyWithTerms.domain)}/edit`,
			)
			const tmpl = page.locator(
				'section[aria-labelledby="company-templates-heading"]',
			)
			const authRow = tmpl.locator('div.grid > section').first()
			await uploadDocumentViaFileInput({
				page,
				container: authRow,
				fileInput: authRow.locator('input[type="file"]'),
				postPattern: editPattern,
				statusPattern: DOCUMENT_UPLOAD_STATUS.uploaded,
			})
			const contractRow = tmpl.locator('div.grid > section').nth(1)
			await uploadDocumentViaFileInput({
				page,
				container: contractRow,
				fileInput: contractRow.locator('input[type="file"]'),
				postPattern: editPattern,
				statusPattern: DOCUMENT_UPLOAD_STATUS.uploaded,
			})

			await loginPage(page, applicantWithCompany.email)
			await page.goto(`/cuenta/applications/${app.id}/pre-authorized`)
			await expect(
				page.getByRole('heading', { name: /oferta preautorizada/i }),
			).toBeVisible()
			await expect(
				page.getByRole('link', { name: /descargar carta de autorización/i }),
			).toBeVisible()
			await expect(
				page.getByRole('link', { name: /descargar contrato/i }),
			).toBeVisible()

			const authRes = await page.request.get(
				`http://localhost:3000/api/applications/${app.id}/company-templates/authorization/file`,
			)
			expect(authRes.status()).toBe(200)
			const contractRes = await page.request.get(
				`http://localhost:3000/api/applications/${app.id}/company-templates/contract/file`,
			)
			expect(contractRes.status()).toBe(200)

			await loginPage(page, adminUser.email)
			await resetCompany(companyWithTerms)
			await deleteUsersByEmail([adminUser.email])
		})

		test('keeps submit disabled with a hint until all three package documents exist as pending', async ({
			page,
		}) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			})
			await page.goto(`/cuenta/applications/${app.id}/pre-authorized`)
			await expect(
				page.getByRole('heading', { name: /oferta preautorizada/i }),
			).toBeVisible()
			await page
				.locator(
					'section[aria-labelledby="cuenta-application-doc-payroll-receipt"]',
				)
				.scrollIntoViewIfNeeded()
			await expect(
				page.locator(
					'section[aria-labelledby="cuenta-application-doc-payroll-receipt"]',
				),
			).toBeVisible()
			const enviar = page.getByRole('button', { name: /^Enviar$/i })
			await expect(enviar).toBeVisible()
			await expect(enviar).toBeDisabled()
			await expect(
				page.getByText(
					/Los tres documentos deben estar cargados y en estado pendiente de revisión/i,
				),
			).toBeVisible()
		})

		test('shows pending payroll receipt on pre-authorized screen right after upload without leaving the page', async ({
			page,
		}) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			})
			await seedPreAuthorizedPackageDocuments({
				applicationId: app.id,
				variant: 'initialIntakeApprovedOnly',
			})
			await page.goto(`/cuenta/applications/${app.id}/pre-authorized`)
			await expect(
				page.getByRole('heading', { name: /oferta preautorizada/i }),
			).toBeVisible()

			const payroll = applicationDocumentSlot(page, 'payroll-receipt')
			await payroll.scrollIntoViewIfNeeded()
			await uploadDocumentViaFileInput({
				page,
				container: payroll,
				fileInput: payroll.locator('input[name="file"]'),
				postPattern: postToCuentaApplicationUrl(app.id),
				statusPattern: DOCUMENT_UPLOAD_STATUS.pendingReview,
			})
		})

		test('submits a complete pending package for review and shows awaiting-authorization after reload', async ({
			page,
		}) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			})
			await seedPreAuthorizedPackageDocuments({
				applicationId: app.id,
				variant: 'initialIntakeApprovedAndPackagePending',
			})
			await page.goto(`/cuenta/applications/${app.id}/pre-authorized`)
			await expect(
				page.getByRole('heading', { name: /oferta preautorizada/i }),
			).toBeVisible()
			await page
				.locator(
					'section[aria-labelledby="cuenta-application-doc-payroll-receipt"]',
				)
				.scrollIntoViewIfNeeded()
			const enviar = page.getByRole('button', { name: /^Enviar$/i })
			await expect(enviar).toBeVisible()
			await expect(enviar).toBeEnabled()

			const submitPromise = waitForSuccessfulPost(
				page,
				postToCuentaApplicationUrl(app.id),
			)
			await enviar.click()
			await submitPromise

			await page.goto(`/cuenta/applications/${app.id}`)
			await expect(
				page
					.locator('[role="status"]')
					.filter({ hasText: /en revisión de autorización/i }),
			).toBeVisible()
			await expect(
				cuentaMain(page)
					.getByText(/En revisión de autorización/i)
					.first(),
			).toBeVisible()
			await page.goto(`/cuenta/applications/${app.id}/pre-authorized`)
			await expect(page.getByRole('button', { name: /^Enviar$/i })).toHaveCount(
				0,
			)
		})

		test('uploads three package files then submits for review', async ({
			page,
		}) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			})
			await seedPreAuthorizedPackageDocuments({
				applicationId: app.id,
				variant: 'initialIntakeApprovedOnly',
			})
			await page.goto(`/cuenta/applications/${app.id}/pre-authorized`)
			await expect(
				page.getByRole('heading', { name: /oferta preautorizada/i }),
			).toBeVisible()
			await page
				.locator(
					'section[aria-labelledby="cuenta-application-doc-payroll-receipt"]',
				)
				.scrollIntoViewIfNeeded()

			const p = postToCuentaApplicationUrl(app.id)
			const payroll = applicationDocumentSlot(page, 'payroll-receipt')
			await uploadDocumentViaFileInput({
				page,
				container: payroll,
				fileInput: payroll.locator('input[name="file"]'),
				postPattern: p,
				statusPattern: DOCUMENT_UPLOAD_STATUS.pendingReview,
			})
			const contract = applicationDocumentSlot(page, 'contract')
			await uploadDocumentViaFileInput({
				page,
				container: contract,
				fileInput: contract.locator('input[name="file"]'),
				postPattern: p,
				statusPattern: DOCUMENT_UPLOAD_STATUS.pendingReview,
			})
			const authorization = applicationDocumentSlot(page, 'authorization')
			await uploadDocumentViaFileInput({
				page,
				container: authorization,
				fileInput: authorization.locator('input[name="file"]'),
				postPattern: p,
				statusPattern: DOCUMENT_UPLOAD_STATUS.pendingReview,
			})

			const enviar = page.getByRole('button', { name: /^Enviar$/i })
			await expect(enviar).toBeVisible()
			await expect(enviar).toBeEnabled()
			const submitPromise = waitForSuccessfulPost(page, p)
			await enviar.click()
			await submitPromise

			await page.goto(`/cuenta/applications/${app.id}`)
			await expect(
				page
					.locator('[role="status"]')
					.filter({ hasText: /en revisión de autorización/i }),
			).toBeVisible()
		})

		test('next-step banner link targets pre-authorized offer page', async ({
			page,
		}) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			})
			const preAuthPath = `/cuenta/applications/${app.id}/pre-authorized`
			await page.goto(`/cuenta/applications/${app.id}`)
			await expect(
				page.getByRole('heading', { name: /resumen de tu solicitud/i }),
			).toBeVisible()
			await expect(
				page.getByText(/siguiente paso: autorización/i),
			).toBeVisible()
			const link = page.getByRole('link', {
				name: /ir a oferta y documentación/i,
			})
			await expect(link).toBeVisible()
			await expect(link).toHaveAttribute('href', preAuthPath)
			await page.goto(preAuthPath)
			await expect(
				page.getByRole('heading', { name: /oferta preautorizada/i }),
			).toBeVisible()
		})

		test('keeps submit disabled when the latest row for a package type is approved', async ({
			page,
		}) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'pre-authorized',
			})
			await seedPreAuthorizedPackageDocuments({
				applicationId: app.id,
				variant: 'initialIntakeApprovedAndPackagePending_payrollLatestApproved',
			})
			await page.goto(`/cuenta/applications/${app.id}/pre-authorized`)
			await expect(
				page.getByRole('heading', { name: /oferta preautorizada/i }),
			).toBeVisible()
			const enviar = page.getByRole('button', { name: /^Enviar$/i })
			await enviar.scrollIntoViewIfNeeded()
			await expect(enviar).toBeVisible()
			await expect(enviar).toBeDisabled()
			await expect(
				page.getByText(
					/Los tres documentos deben estar cargados y en estado pendiente de revisión/i,
				),
			).toBeVisible()
		})

		test('shows rejected auth package document and awaiting note on pre-authorized offer', async ({
			page,
		}) => {
			const reason = 'E2E contrato rechazado en revisión de autorización'
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'awaiting-authorization',
			})
			await seedPreAuthorizedPackageDocuments({
				applicationId: app.id,
				variant: 'initialIntakeApprovedAndPackagePending',
			})
			await updateLatestApplicationDocumentByType({
				applicationId: app.id,
				documentType: 'contract',
				status: 'rejected',
				rejectionReason: reason,
			})
			await page.goto(`/cuenta/applications/${app.id}/pre-authorized`)
			await expect(
				page.getByRole('heading', { name: /oferta preautorizada/i }),
			).toBeVisible()
			await expect(
				page
					.locator('[role="status"]')
					.filter({ hasText: /en revisión de autorización/i }),
			).toBeVisible()
			await expect(page.getByText(/Tu paquete está en revisión/i)).toBeVisible()
			const contractSection = page.locator(
				'section[aria-labelledby="cuenta-application-doc-contract"]',
			)
			await contractSection.scrollIntoViewIfNeeded()
			await expect(contractSection).toContainText(reason)
		})

		test('stays awaiting-authorization when applicant reuploads a package file during review', async ({
			page,
		}) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '15000',
				salaryAtApplication: '100000',
				status: 'awaiting-authorization',
			})
			await seedPreAuthorizedPackageDocuments({
				applicationId: app.id,
				variant: 'initialIntakeApprovedAndPackagePending',
			})
			await page.goto(`/cuenta/applications/${app.id}`)
			await expect(
				page
					.locator('[role="status"]')
					.filter({ hasText: /en revisión de autorización/i }),
			).toBeVisible()
			await page.goto(`/cuenta/applications/${app.id}/pre-authorized`)

			const reupload = waitForSuccessfulPost(
				page,
				postToCuentaApplicationUrl(app.id),
			)
			await page
				.locator(
					'section[aria-labelledby="cuenta-application-doc-contract"] input[name="file"]',
				)
				.setInputFiles(SAMPLE_DOCUMENT_WEBP)
			await reupload

			await page.goto(`/cuenta/applications/${app.id}/pre-authorized`)
			await expect(
				page
					.locator('[role="status"]')
					.filter({ hasText: /en revisión de autorización/i }),
			).toBeVisible()
			await expect(page.getByRole('button', { name: /^Enviar$/i })).toHaveCount(
				0,
			)
		})
	})

	test.describe('Disbursed application detail', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, applicantWithCompany.email)
		})

		test('links to the related credit, shows transfer reference on the credit page, and omits amount from summary', async ({
			page,
		}) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '25000',
				salaryAtApplication: '100000',
				status: 'disbursed',
				transferReference: 'REF-123456',
				receiptFileName: 'comprobante.pdf',
				phoneNumber: '8112345678',
				payrollNumber: 'EMP-001',
				rfc: 'GODE561231GR8',
				clabe: '032180000118359719',
				streetAndNumber: 'Av. Revolucion 123',
				interiorNumber: '1206 Torre 4',
				city: 'Monterrey',
				state: 'Nuevo León',
				country: 'México',
				postalCode: '64000',
			})
			await page.goto(`/cuenta/applications/${app.id}`)
			const main = cuentaMain(page)
			await expect(
				page.getByRole('heading', { name: /resumen de tu solicitud/i }),
			).toBeVisible()
			await expect(
				main
					.locator('[role="status"]')
					.filter({ hasText: /dispersado/i })
					.first(),
			).toBeVisible()
			const creditLink = page.getByRole('link', { name: /ver mi crédito/i })
			await expect(creditLink).toBeVisible()
			const href = await creditLink.getAttribute('href')
			if (href == null) throw new Error('expected href on credit link')
			expect(href).toMatch(/^\/cuenta\/credits\/\d+$/)
			await expect(page.getByText('REF-123456')).toHaveCount(0)
			await expect(page.getByText('comprobante.pdf')).toHaveCount(0)
			await expect(
				page.getByRole('heading', { name: /monto del crédito/i, level: 2 }),
			).toHaveCount(0)
			await expect(page.getByText('8112345678')).toBeVisible()
			await expect(page.getByText('GODE561231GR8')).toBeVisible()
			await expect(page.getByText('Av. Revolucion 123')).toBeVisible()
			await expect(page.getByText('Monterrey')).toBeVisible()

			await page.goto(href)
			await expect(
				page.getByRole('heading', { name: /detalle de tu crédito/i }),
			).toBeVisible()
			const creditMain = cuentaMain(page)
			await expect(creditMain.getByText('REF-123456')).toBeVisible()
			await expect(creditMain.getByText('comprobante.pdf')).toBeVisible()
			await expect(
				page
					.getByRole('link', { name: /ver la solicitud relacionada/i })
					.first(),
			).toHaveAttribute('href', `/cuenta/applications/${app.id}`)
		})
	})

	test.describe('Application detail isolation', () => {
		test('applicant cannot open another applicant application by id', async ({
			page,
		}) => {
			const app = await resetApplicantApplication({
				applicantId: seed.applicantBId,
				termOfferingId: seed.termOfferingId,
				creditAmount: '99999',
				salaryAtApplication: '100000',
			})
			await loginPage(page, applicantWithCompany.email)
			const res = await page.goto(`/cuenta/applications/${app.id}`)
			expect(res?.status()).toBeGreaterThanOrEqual(400)
			await expect(
				page.getByRole('heading', { name: 'Página no encontrada' }),
			).toBeVisible()
		})

		test('invalid application id shows 404', async ({ page }) => {
			await loginPage(page, applicantWithCompany.email)
			const res0 = await page.goto('/cuenta/applications/0')
			expect(res0?.status()).toBeGreaterThanOrEqual(400)
			await expect(
				page.getByRole('heading', { name: 'Página no encontrada' }),
			).toBeVisible()
			const resFoo = await page.goto('/cuenta/applications/foo')
			expect(resFoo?.status()).toBeGreaterThanOrEqual(400)
			await expect(
				page.getByRole('heading', { name: 'Página no encontrada' }),
			).toBeVisible()
		})
	})
})
