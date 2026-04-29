import { expect, test } from '@playwright/test'
import { adminUser, companies } from '~/e2e/admin/companies.fixtures'
import {
	cleanupAdminCompanies,
	deleteCompaniesByDomain,
	deleteUsersByEmail,
	resetCompany,
	resetUser,
	seedAdminCompanies,
} from '~/e2e/server/tasks'
import { loginPage } from '../helpers/auth'
import { findTableRow, selectRadix } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'

registerDbSpecGuards()

test.describe('Admin Companies List', () => {
	test.beforeAll(async () => {
		await cleanupAdminCompanies()
		await seedAdminCompanies()
	})

	test.afterAll(async () => {
		await cleanupAdminCompanies()
	})

	test.describe('Access Control', () => {
		test('redirects non-admin users to unauthorized page', async ({ page }) => {
			const agentUser = {
				name: 'Agent User',
				email: 'agent.companies@example.com',
				roles: ['agent', 'requests'] as const,
			}
			await resetUser({
				name: agentUser.name,
				email: agentUser.email,
				roles: [...agentUser.roles],
			})
			await loginPage(page, agentUser.email)
			await page.goto('/equipo/companies')
			await expect(
				page.getByRole('heading', { name: '403 - No Autorizado' }),
			).toBeVisible()

			await deleteUsersByEmail([agentUser.email])
		})

		test('allows admin users to access companies page', async ({ page }) => {
			await loginPage(page, adminUser.email)
			await page.goto('/equipo/companies')
			await expect(
				page.locator('input[aria-label="Filtrar empresas..."]'),
			).toBeVisible()
		})
	})

	test.describe('Companies List Display', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, adminUser.email)
			await page.goto('/equipo/companies')
			await expect(page.locator('table')).toBeVisible()
		})

		test('displays companies table with correct columns', async ({ page }) => {
			await expect(page.locator('table')).toBeAttached()
			const table = page.locator('table')
			await expect(
				table.getByRole('columnheader', { name: /nombre/i }),
			).toBeAttached()
			await expect(
				table.getByRole('columnheader', { name: /dominio/i }),
			).toBeAttached()
			await expect(
				table.getByRole('columnheader', { name: /tasa/i }),
			).toBeAttached()
			await expect(
				table.getByRole('columnheader', { name: /capacidad de préstamo/i }),
			).toBeAttached()
			await expect(
				table.getByRole('columnheader', { name: /frecuencia de pago/i }),
			).toBeAttached()
			await expect(
				table.getByRole('columnheader', { name: /estado/i }),
			).toBeAttached()
			await expect(
				table.getByRole('columnheader', { name: /fecha de creación/i }),
			).toBeAttached()
			await expect(
				table.getByRole('columnheader', { name: /solicitante/i }),
			).toHaveCount(0)
		})

		test('displays all companies including active and inactive', async ({
			page,
		}) => {
			await expect(page.getByText(companies.acme.name)).toBeAttached()
			await expect(page.getByText(companies.techstart.name)).toBeAttached()
			await expect(page.getByText(companies.inactive.name)).toBeAttached()
		})

		test('displays company details correctly', async ({ page }) => {
			await expect(page.locator('table')).toContainText(companies.acme.domain)
			const row = findTableRow(page, companies.acme.name)
			await row.scrollIntoViewIfNeeded()
			await expect(row.getByText(companies.acme.domain)).toBeAttached()
			await expect(row.getByText('2.50%')).toBeAttached()
			await expect(row.getByText('30%')).toBeAttached()
			await expect(row.getByText('Mensual')).toBeAttached()
			await expect(row.getByText('Activa')).toBeAttached()
		})

		test('displays inactive companies with inactive badge', async ({
			page,
		}) => {
			const row = findTableRow(page, companies.inactive.name)
			await row.scrollIntoViewIfNeeded()
			await expect(row.getByText('Inactiva')).toBeAttached()
		})

		test('displays companies without borrowing capacity rate', async ({
			page,
		}) => {
			const row = findTableRow(page, companies.techstart.name)
			await row.scrollIntoViewIfNeeded()
			await expect(row.getByText('-')).toBeAttached()
		})

		test('displays bi-monthly frequency correctly', async ({ page }) => {
			const row = findTableRow(page, companies.techstart.name)
			await row.scrollIntoViewIfNeeded()
			await expect(row.getByText('Quincenal')).toBeAttached()
		})
	})

	test.describe('Search Functionality', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, adminUser.email)
			await page.goto('/equipo/companies')
			await expect(page.locator('table')).toBeVisible()
		})

		test('filters companies by name', async ({ page }) => {
			await page.locator('input[type="search"]').fill('Acme')
			await expect(page.getByText(companies.acme.name)).toBeAttached()
			await expect(page.getByText(companies.techstart.name)).toHaveCount(0)
			await expect(page.getByText(companies.inactive.name)).toHaveCount(0)
		})

		test('filters companies by domain', async ({ page }) => {
			await page.locator('input[type="search"]').clear()
			await page.locator('input[type="search"]').fill('techstart')
			await expect(page.getByText(companies.techstart.name)).toBeAttached()
			await expect(page.getByText(companies.acme.name)).toHaveCount(0)
			await expect(page.getByText(companies.inactive.name)).toHaveCount(0)
		})

		test('shows "No results" when no companies match filter', async ({
			page,
		}) => {
			await page.locator('input[type="search"]').fill('nonexistent')
			await expect(page.getByText(/no results/i)).toBeAttached()
		})
	})

	test.describe('Active Filter', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, adminUser.email)
			await page.goto('/equipo/companies')
			await expect(page.locator('table')).toBeVisible()
		})

		test('shows all companies by default', async ({ page }) => {
			await expect(page.getByText(companies.acme.name)).toBeAttached()
			await expect(page.getByText(companies.techstart.name)).toBeAttached()
			await expect(page.getByText(companies.inactive.name)).toBeAttached()
		})

		test('filters to active companies only when activeOnly=true', async ({
			page,
		}) => {
			await page.goto('/equipo/companies?activeOnly=true')
			await expect(page.getByText(companies.acme.name)).toBeAttached()
			await expect(page.getByText(companies.techstart.name)).toBeAttached()
			await expect(page.getByText(companies.inactive.name)).toHaveCount(0)
		})
	})

	test.describe('Company Creation', () => {
		const creationTestDomains = [
			'newtest.com',
			'norate.com',
			'e2e-initialterms.com',
			'e2e-payroll-block.com',
			'e2e-bimonth-initial-terms.com',
		]

		test.beforeAll(async () => {
			await deleteCompaniesByDomain(creationTestDomains)
		})

		test.afterAll(async () => {
			await deleteCompaniesByDomain(creationTestDomains)
		})

		test.beforeEach(async ({ page }) => {
			await loginPage(page, adminUser.email)
			await page.goto('/equipo/companies')
			await expect(page.locator('table')).toBeVisible()
		})

		test('Nueva empresa link targets create company page', async ({ page }) => {
			await expect(page.locator('table')).toBeAttached()
			const link = page.getByRole('link', { name: /nueva empresa/i })
			await expect(link).toBeVisible()
			await expect(link).toHaveAttribute('href', '/equipo/companies/new')
			await page.goto('/equipo/companies/new')
			await expect(
				page.getByRole('button', { name: /crear empresa/i }),
			).toBeVisible()
		})

		test('creates a new company with all fields', async ({ page }) => {
			const newCompany = {
				name: 'New Test Company',
				domain: 'newtest.com',
				rate: '0.0275',
				borrowingCapacityRate: '0.35',
				employeeSalaryFrequency: 'monthly' as const,
			}

			await page.goto('/equipo/companies/new')

			await page.locator('input[name="name"]').fill(newCompany.name)
			await page.locator('input[name="domain"]').fill(newCompany.domain)
			await page.locator('input[name="rate"]').fill('2.75')
			await page.locator('input[name="borrowingCapacityRate"]').fill('35')
			await selectRadix(
				page,
				'employeeSalaryFrequency',
				newCompany.employeeSalaryFrequency === 'monthly'
					? 'Mensual'
					: 'Quincenal',
			)

			await page.getByRole('button', { name: /crear|guardar|submit/i }).click()

			await expect(page.locator('main')).toBeVisible()
			await expect(page.locator('table')).toBeVisible()
			const row = findTableRow(page, newCompany.name)
			await row.scrollIntoViewIfNeeded()
			await expect(
				row.getByRole('cell', { name: newCompany.name }),
			).toBeVisible()
			await expect(
				row.getByRole('cell', { name: newCompany.domain }),
			).toBeVisible()

			await deleteCompaniesByDomain([newCompany.domain])
		})

		test('creates company without borrowingCapacityRate', async ({ page }) => {
			const newCompany = {
				name: 'Company Without Rate',
				domain: 'norate.com',
				rate: '0.0250',
				employeeSalaryFrequency: 'bi-monthly' as const,
			}

			await page.goto('/equipo/companies/new')

			await page.locator('input[name="name"]').fill(newCompany.name)
			await page.locator('input[name="domain"]').fill(newCompany.domain)
			await page.locator('input[name="rate"]').fill('2.5')
			await selectRadix(page, 'employeeSalaryFrequency', 'Quincenal')

			await page.getByRole('button', { name: /crear|guardar|submit/i }).click()

			await expect(page.locator('main')).toBeVisible()
			await expect(page.locator('table')).toBeVisible()
			const row = findTableRow(page, newCompany.name)
			await row.scrollIntoViewIfNeeded()
			await expect(
				row.getByRole('cell', { name: newCompany.name }),
			).toBeVisible()

			await deleteCompaniesByDomain([newCompany.domain])
		})

		test('creates company with optional initial credit terms', async ({
			page,
		}) => {
			const newCompany = {
				name: 'Company With Initial Terms',
				domain: 'e2e-initialterms.com',
				rate: '0.0250',
				employeeSalaryFrequency: 'monthly' as const,
			}

			await page.goto('/equipo/companies/new')

			await page.locator('input[name="name"]').fill(newCompany.name)
			await page.locator('input[name="domain"]').fill(newCompany.domain)
			await page.locator('input[name="rate"]').fill('2.5')
			await selectRadix(page, 'employeeSalaryFrequency', 'Mensual')

			await page.getByRole('button', { name: /definir plazos/i }).click()
			await page
				.getByLabel(/Duración \(número de pagos\)/i)
				.first()
				.fill('6')
			await page.getByRole('button', { name: /agregar otro plazo/i }).click()
			const durationInputs = page.getByLabel(/Duración \(número de pagos\)/i)
			await durationInputs.nth(1).fill('12')

			await page.getByRole('button', { name: /crear|guardar|submit/i }).click()

			await expect(page.locator('main')).toBeVisible()
			await expect(page.locator('table')).toBeVisible()
			const row = findTableRow(page, newCompany.name)
			await row.scrollIntoViewIfNeeded()
			await expect(
				row.getByRole('cell', { name: newCompany.name }),
			).toBeVisible()

			await page.goto(
				`/equipo/companies/${encodeURIComponent(newCompany.domain)}/edit`,
			)
			await expect(page.getByText('6 meses', { exact: true })).toBeVisible()
			await expect(page.getByText('12 meses', { exact: true })).toBeVisible()

			await deleteCompaniesByDomain([newCompany.domain])
		})

		test('creates bi-monthly company with initial terms in quincenas', async ({
			page,
		}) => {
			const newCompany = {
				name: 'Bi-Monthly Initial Terms Co',
				domain: 'e2e-bimonth-initial-terms.com',
				rate: '0.0250',
			}

			await page.goto('/equipo/companies/new')

			await page.locator('input[name="name"]').fill(newCompany.name)
			await page.locator('input[name="domain"]').fill(newCompany.domain)
			await page.locator('input[name="rate"]').fill('2.5')
			await selectRadix(page, 'employeeSalaryFrequency', 'Quincenal')

			await page.getByRole('button', { name: /definir plazos/i }).click()
			await page
				.getByLabel(/Duración \(número de pagos\)/i)
				.first()
				.fill('24')

			await page.getByRole('button', { name: /crear|guardar|submit/i }).click()

			await expect(page.locator('main')).toBeVisible()
			await expect(page.locator('table')).toBeVisible()

			await page.goto(
				`/equipo/companies/${encodeURIComponent(newCompany.domain)}/edit`,
			)
			await expect(
				page.getByText('24 quincenas', { exact: true }),
			).toBeVisible()

			await deleteCompaniesByDomain([newCompany.domain])
		})

		test('blocks changing payroll frequency when company has mismatched-term risk', async ({
			page,
		}) => {
			const newCompany = {
				name: 'Payroll Block Co',
				domain: 'e2e-payroll-block.com',
				rate: '0.0250',
			}

			await page.goto('/equipo/companies/new')

			await page.locator('input[name="name"]').fill(newCompany.name)
			await page.locator('input[name="domain"]').fill(newCompany.domain)
			await page.locator('input[name="rate"]').fill('2.5')
			await selectRadix(page, 'employeeSalaryFrequency', 'Mensual')

			await page.getByRole('button', { name: /definir plazos/i }).click()
			await page
				.getByLabel(/Duración \(número de pagos\)/i)
				.first()
				.fill('12')

			await page.getByRole('button', { name: /crear|guardar|submit/i }).click()
			await expect(page.locator('table')).toBeVisible()

			await page.goto(
				`/equipo/companies/${encodeURIComponent(newCompany.domain)}/edit`,
			)
			await selectRadix(page, 'employeeSalaryFrequency', 'Quincenal')
			await page.getByRole('button', { name: /guardar|save/i }).click()

			await expect(
				page.getByText(
					/No puedes cambiar la frecuencia de pago mientras existan plazos/i,
				),
			).toBeVisible()

			await deleteCompaniesByDomain([newCompany.domain])
		})

		test('validates required fields', async ({ page }) => {
			await page.goto('/equipo/companies/new')

			await page.getByRole('button', { name: /crear|guardar|submit/i }).click()

			await expect(page.getByText('El nombre es requerido')).toBeVisible()
			await expect(page.getByText('El dominio es requerido')).toBeVisible()
			await expect(page.getByText('La tasa es requerida')).toBeVisible()
		})

		test('validates domain uniqueness', async ({ page }) => {
			await page.goto('/equipo/companies/new')

			await page.locator('input[name="name"]').fill('Duplicate Domain Company')
			await page.locator('input[name="domain"]').fill('acme.com')
			await page.locator('input[name="rate"]').fill('2.5')
			await selectRadix(page, 'employeeSalaryFrequency', 'Mensual')

			await page.getByRole('button', { name: /crear|guardar|submit/i }).click()

			await expect(
				page.getByText('El dominio ya existe. Debe ser único.'),
			).toBeVisible()
		})

		test('validates domain format', async ({ page }) => {
			await page.goto('/equipo/companies/new')

			await page.locator('input[name="name"]').fill('Invalid Domain')
			await page.locator('input[name="domain"]').fill('not-a-valid-domain')
			await page.locator('input[name="rate"]').fill('2.5')
			await selectRadix(page, 'employeeSalaryFrequency', 'Mensual')

			await page.getByRole('button', { name: /crear|guardar|submit/i }).click()

			await expect(
				page.getByText(
					'El dominio debe tener un formato válido (ej: ejemplo.com)',
				),
			).toBeVisible()
		})

		test('validates rate is positive', async ({ page }) => {
			await page.goto('/equipo/companies/new')

			await page.locator('input[name="name"]').fill('Invalid Rate')
			await page.locator('input[name="domain"]').fill('invalidrate.com')
			await page.locator('input[name="rate"]').fill('-5')
			await selectRadix(page, 'employeeSalaryFrequency', 'Mensual')

			await page.getByRole('button', { name: /crear|guardar|submit/i }).click()

			await expect(
				page.getByText('La tasa debe ser un número positivo'),
			).toBeVisible()
		})

		test('validates borrowingCapacityRate is between 0 and 100', async ({
			page,
		}) => {
			await page.goto('/equipo/companies/new')

			await page.locator('input[name="name"]').fill('Invalid Capacity')
			await page.locator('input[name="domain"]').fill('invalidcap.com')
			await page.locator('input[name="rate"]').fill('2.5')
			await page.locator('input[name="borrowingCapacityRate"]').fill('150')
			await selectRadix(page, 'employeeSalaryFrequency', 'Mensual')

			await page.getByRole('button', { name: /crear|guardar|submit/i }).click()

			await expect(
				page.getByText('La capacidad de préstamo debe ser menor o igual a 100'),
			).toBeVisible()
		})
	})

	test.describe('Company Editing', () => {
		let editCompany: {
			name: string
			domain: string
			rate: string
			borrowingCapacityRate: string | null
			employeeSalaryFrequency: 'bi-monthly' | 'monthly'
			active: boolean
		}

		test.beforeAll(async () => {
			editCompany = {
				name: 'Edit Test Company',
				domain: 'e2e-editcompany-local',
				rate: '0.0250',
				borrowingCapacityRate: '0.30',
				employeeSalaryFrequency: 'monthly',
				active: true,
			}
			await resetCompany(editCompany)
		})

		test.afterAll(async () => {
			await deleteCompaniesByDomain([editCompany.domain])
		})

		test.beforeEach(async ({ page }) => {
			await loginPage(page, adminUser.email)
		})

		test('row edit link targets company edit page', async ({ page }) => {
			const editHref = `/equipo/companies/${encodeURIComponent(editCompany.domain)}/edit`
			await page.goto('/equipo/companies')
			await expect(page.locator('table')).toBeVisible()
			const row = findTableRow(page, editCompany.name)
			await row.scrollIntoViewIfNeeded()
			const editLink = row.locator('a[href*="/edit"]')
			await expect(editLink).toBeAttached()
			await expect(editLink).toHaveAttribute('href', editHref)
			await page.goto(editHref)
			await expect(page.getByText(/editar|edit/i)).toBeVisible()
		})

		test('loads existing company data in form', async ({ page }) => {
			await page.goto(
				`/equipo/companies/${encodeURIComponent(editCompany.domain)}/edit`,
			)

			await expect(page.locator('input[name="name"]')).toHaveValue(
				editCompany.name,
			)
			await expect(page.locator('input[name="domain"]')).toHaveValue(
				editCompany.domain,
			)
			await expect(page.locator('input[name="rate"]')).toHaveValue('2.5')
			await expect(
				page.locator('input[name="borrowingCapacityRate"]'),
			).toHaveValue('30')
			const freqLabel = page.getByText(/frecuencia de pago/i).first()
			const htmlFor = await freqLabel.getAttribute('for')
			expect(htmlFor).toBeTruthy()
			if (htmlFor) {
				await expect(
					page.locator(`[id=${JSON.stringify(htmlFor)}]`),
				).toContainText('Mensual')
			}
		})

		test('toggles active status', async ({ page }) => {
			await page.goto(
				`/equipo/companies/${encodeURIComponent(editCompany.domain)}/edit`,
			)

			await page.getByLabel(/activa/i).click()

			await page.getByRole('button', { name: /guardar|save/i }).click()

			await expect(page.locator('main')).toBeVisible()
			await expect(page.locator('table')).toBeVisible()
			const row1 = findTableRow(page, editCompany.name)
			await row1.scrollIntoViewIfNeeded()
			await expect(row1.getByText('Inactiva')).toBeAttached()

			await page.goto(
				`/equipo/companies/${encodeURIComponent(editCompany.domain)}/edit`,
			)
			await page.getByLabel(/activa/i).click()
			await page.getByRole('button', { name: /guardar|save/i }).click()

			await expect(page.locator('main')).toBeVisible()
			await expect(page.locator('table')).toBeVisible()
			const row2 = findTableRow(page, editCompany.name)
			await row2.scrollIntoViewIfNeeded()
			await expect(row2.getByText('Activa')).toBeAttached()
		})

		test('updates company details', async ({ page }) => {
			await page.goto(
				`/equipo/companies/${encodeURIComponent(editCompany.domain)}/edit`,
			)

			await page.locator('input[name="name"]').clear()
			await page.locator('input[name="name"]').fill('Updated Company Name')
			await page.locator('input[name="rate"]').clear()
			await page.locator('input[name="rate"]').fill('3.0')
			await page.locator('input[name="borrowingCapacityRate"]').clear()
			await page.locator('input[name="borrowingCapacityRate"]').fill('40')

			await page
				.getByRole('button', { name: /guardar|save|actualizar/i })
				.click()

			await expect(page.locator('table')).toBeVisible()
			await page
				.locator('input[aria-label="Filtrar empresas..."]')
				.fill('Updated')
			await expect(page.getByText('Updated Company Name')).toBeAttached()

			await page.goto(
				`/equipo/companies/${encodeURIComponent(editCompany.domain)}/edit`,
			)
			await page.locator('input[name="name"]').clear()
			await page.locator('input[name="name"]').fill(editCompany.name)
			await page.locator('input[name="rate"]').clear()
			await page.locator('input[name="rate"]').fill('2.5')
			await page.locator('input[name="borrowingCapacityRate"]').clear()
			await page.locator('input[name="borrowingCapacityRate"]').fill('30')
			await page.getByRole('button', { name: /guardar|save/i }).click()
		})

		test('prevents editing domain to duplicate value', async ({ page }) => {
			await page.goto(
				`/equipo/companies/${encodeURIComponent(editCompany.domain)}/edit`,
			)

			await expect(page.locator('input[name="domain"]')).toBeDisabled()
			await expect(
				page.getByText(/el dominio no puede ser modificado/i),
			).toBeVisible()
		})
	})
})
