import { expect, test } from '@playwright/test'
import {
	cleanupCompanyTermsManagementFixture,
	companyTermsE2e,
	deleteUsersByEmail,
	resetUser,
	seedApplicationUsingTermOffering,
	seedCompanyTermsManagementFixture,
} from '~/e2e/server/tasks'
import { loginPage } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'

registerDbSpecGuards()

test.describe('Admin company term management', () => {
	test.beforeAll(async () => {
		await cleanupCompanyTermsManagementFixture()
	})

	test.afterAll(async () => {
		await cleanupCompanyTermsManagementFixture()
	})

	test.describe('Access control', () => {
		test('redirects non-admin users away from company edit (no term UI)', async ({
			page,
		}) => {
			const agentOnly = {
				name: 'No Admin Terms',
				email: 'no-admin-terms@example.com',
				roles: ['agent', 'requests'] as const,
			}
			await resetUser({
				name: agentOnly.name,
				email: agentOnly.email,
				roles: [...agentOnly.roles],
			})
			await seedCompanyTermsManagementFixture()

			await loginPage(page, agentOnly.email)
			await page.goto(
				`/equipo/companies/${encodeURIComponent(companyTermsE2e.domain)}/edit`,
			)
			await expect(
				page.getByRole('heading', { name: '403 - No Autorizado' }),
			).toBeVisible()

			await deleteUsersByEmail([agentOnly.email])
		})
	})

	test.describe('Term CRUD on company edit', () => {
		let fixture: Awaited<ReturnType<typeof seedCompanyTermsManagementFixture>>

		test.beforeEach(async () => {
			await cleanupCompanyTermsManagementFixture()
			fixture = await seedCompanyTermsManagementFixture()
			await resetUser({
				name: 'Terms Admin',
				email: fixture.agentEmail,
				roles: ['agent', 'admin'],
			})
		})

		test('admin adds a new company term and it appears in the table', async ({
			page,
		}) => {
			await loginPage(page, fixture.agentEmail)
			await page.goto(
				`/equipo/companies/${encodeURIComponent(companyTermsE2e.domain)}/edit`,
			)

			await expect(
				page.getByRole('heading', { name: 'Plazos de crédito' }),
			).toBeVisible()
			await expect(page.getByText('12 meses', { exact: true })).toBeVisible()

			await page.getByLabel(/Duración \(número de pagos\)/i).fill('18')
			await page.getByRole('button', { name: 'Agregar plazo' }).click()

			await expect(page.getByText('18 meses', { exact: true })).toBeVisible()
		})

		test('admin cannot add the same term duration twice for the company', async ({
			page,
		}) => {
			await loginPage(page, fixture.agentEmail)
			await page.goto(
				`/equipo/companies/${encodeURIComponent(companyTermsE2e.domain)}/edit`,
			)

			await page.getByLabel(/Duración \(número de pagos\)/i).fill('18')
			await page.getByRole('button', { name: 'Agregar plazo' }).click()
			await expect(page.getByText('18 meses', { exact: true })).toBeVisible()

			await page.getByLabel(/Duración \(número de pagos\)/i).fill('18')
			await page.getByRole('button', { name: 'Agregar plazo' }).click()

			await expect(
				page.getByText(/Esta empresa ya tiene ese plazo/i),
			).toBeVisible()
			const rows18 = page.locator('tr', { hasText: '18 meses' })
			await expect(rows18).toHaveCount(1)
		})

		test('admin toggles term availability for new applications', async ({
			page,
		}) => {
			await loginPage(page, fixture.agentEmail)
			await page.goto(
				`/equipo/companies/${encodeURIComponent(companyTermsE2e.domain)}/edit`,
			)

			const row = page.locator('tr', { hasText: '12 meses' })
			const checkbox = row.getByRole('checkbox', {
				name: /Disponible para nuevas solicitudes/i,
			})
			await expect(checkbox).toBeChecked()
			await checkbox.click()
			await expect(checkbox).not.toBeChecked()
			await checkbox.click()
			await expect(checkbox).toBeChecked()
		})

		test('admin edits an unused term duration in the dialog', async ({
			page,
		}) => {
			await loginPage(page, fixture.agentEmail)
			await page.goto(
				`/equipo/companies/${encodeURIComponent(companyTermsE2e.domain)}/edit`,
			)

			const row = page.locator('tr', { hasText: '12 meses' })
			await row.getByRole('button', { name: 'Editar' }).click()

			await expect(
				page.getByRole('dialog', { name: 'Editar plazo' }),
			).toBeVisible()
			await page
				.getByRole('dialog')
				.getByLabel(/Duración/i)
				.fill('24')
			await page
				.getByRole('dialog')
				.getByRole('button', { name: 'Guardar' })
				.click()

			await expect(page.getByText('24 meses', { exact: true })).toBeVisible()
		})

		test('admin edits term duration in the dialog even when referenced by an application', async ({
			page,
		}) => {
			await seedApplicationUsingTermOffering({
				companyId: fixture.companyId,
				termOfferingId: fixture.termOfferingId12,
				applicantEmail: 'terms-locked-applicant@example.com',
			})

			await loginPage(page, fixture.agentEmail)
			await page.goto(
				`/equipo/companies/${encodeURIComponent(companyTermsE2e.domain)}/edit`,
			)

			const row = page.locator('tr', { hasText: '12 meses' })
			await row.getByRole('button', { name: 'Editar' }).click()
			await page
				.getByRole('dialog')
				.getByLabel(/Duración/i)
				.fill('6')
			await page
				.getByRole('dialog')
				.getByRole('button', { name: 'Guardar' })
				.click()

			await expect(page.getByText('6 meses', { exact: true })).toBeVisible()
		})
	})
})
