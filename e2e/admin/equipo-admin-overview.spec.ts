import { expect, test } from '@playwright/test'
import {
	adminOverviewAdmin,
	overviewCompanyList,
} from '~/e2e/admin/equipo-admin-overview.fixtures'
import {
	assignCompanyToUser,
	cleanupAdminOverview,
	deleteUserCompanyAssignmentsByEmail,
	deleteUsersByEmail,
	resetUser,
	seedAdminOverview,
} from '~/e2e/server/tasks'
import { loginPage } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'

registerDbSpecGuards()

test.describe('Equipo admin overview', () => {
	const adminEmail = adminOverviewAdmin.email

	test.beforeAll(async () => {
		await cleanupAdminOverview()
		await seedAdminOverview()
	})

	test.afterAll(async () => {
		await cleanupAdminOverview()
	})

	test.beforeEach(async ({ page }) => {
		await page.context().clearCookies()
		await loginPage(page, adminEmail)
		await page.goto('/equipo')
	})

	test('shows overview when admin has no company selected', async ({
		page,
	}) => {
		await expect(
			page.getByRole('main').getByText('Vista general').first(),
		).toBeVisible()
	})

	test('shows aggregated data across all companies', async ({ page }) => {
		const main = page.getByRole('main')
		await expect(main.getByText('Empresas').first()).toBeVisible()
		await expect(main.getByText('Usuarios').first()).toBeVisible()
		await expect(main.locator('text=/[0-9]+/').first()).toBeVisible()
	})

	test('overview is default for admin with no company selected', async ({
		page,
	}) => {
		await expect(
			page.getByRole('main').getByText('Vista general').first(),
		).toBeVisible()
		await expect(page.getByText('Selecciona una empresa')).toHaveCount(0)
	})

	test('global dashboard shows pipeline, credits, and activity sections', async ({
		page,
	}) => {
		const main = page.getByRole('main')
		await expect(main.getByTestId('admin-dashboard-pipeline')).toBeVisible()
		await expect(main.getByTestId('admin-dashboard-credits')).toBeVisible()
		await expect(main.getByTestId('admin-dashboard-activity')).toBeVisible()
		await expect(
			main.getByRole('heading', { name: 'Solicitudes por estado' }),
		).toBeVisible()
		await expect(
			main.getByRole('heading', { name: 'Actividad reciente' }),
		).toBeVisible()
	})

	test('company-scoped dashboard shows company title and key sections', async ({
		page,
	}) => {
		const companyAName = overviewCompanyList[0]?.name ?? 'Overview Co A'
		await page.locator('#company-switcher-trigger').click()
		await page.getByRole('menuitem', { name: companyAName }).click()

		const main = page.getByRole('main')
		await expect(
			main.getByTestId('admin-dashboard-company-heading'),
		).toContainText(companyAName)
		await expect(
			main.getByRole('heading', { name: 'Vista general' }),
		).toHaveCount(0)
		await expect(main.getByTestId('admin-dashboard-pipeline')).toBeVisible()
		await expect(main.getByTestId('admin-dashboard-activity')).toBeVisible()
	})

	test('admin sidebar shows Administración with users and companies below main navigation', async ({
		page,
	}) => {
		const mainNav = page.getByRole('navigation', { name: 'Navegación' })
		const adminNav = page.getByRole('navigation', { name: 'Administración' })

		await expect(mainNav.getByRole('link', { name: 'Inicio' })).toBeVisible()
		await expect(adminNav.getByRole('link', { name: 'Usuarios' })).toBeVisible()
		await expect(adminNav.getByRole('link', { name: 'Empresas' })).toBeVisible()

		const adminSectionFollowsMain = await page.evaluate(() => {
			const mainNavEl = document.querySelector(
				'nav[aria-label="Navegación"]',
			)?.parentElement
			const adminNavEl = document.querySelector(
				'nav[aria-label="Administración"]',
			)?.parentElement
			if (!(mainNavEl instanceof HTMLElement)) return false
			if (!(adminNavEl instanceof HTMLElement)) return false
			return (
				(mainNavEl.compareDocumentPosition(adminNavEl) &
					Node.DOCUMENT_POSITION_FOLLOWING) !==
				0
			)
		})
		expect(adminSectionFollowsMain).toBe(true)
	})

	test('after selecting a company, admin users and companies links still reach global admin screens', async ({
		page,
	}) => {
		const companyAName = overviewCompanyList[0]?.name ?? 'Overview Co A'
		await page.locator('#company-switcher-trigger').click()
		await page.getByRole('menuitem', { name: companyAName }).click()

		await page
			.getByRole('navigation', { name: 'Administración' })
			.getByRole('link', { name: 'Usuarios' })
			.click()
		await expect(
			page.locator('input[aria-label="Filtrar usuarios..."]'),
		).toBeVisible()

		await page.goto('/equipo')
		await page.locator('#company-switcher-trigger').click()
		const companyBName = overviewCompanyList[1]?.name ?? 'Overview Co B'
		await page.getByRole('menuitem', { name: companyBName }).click()

		await page
			.getByRole('navigation', { name: 'Administración' })
			.getByRole('link', { name: 'Empresas' })
			.click()
		await expect(
			page.locator('input[aria-label="Filtrar empresas..."]'),
		).toBeVisible()
	})

	test('non-admin agent does not see Administración in the sidebar', async ({
		page,
	}) => {
		const agentEmail = 'sidebar.no-admin@example.com'
		const firstDomain = overviewCompanyList[0]?.domain ?? 'overview-co-a.com'
		try {
			await resetUser({
				name: 'Sidebar No Admin',
				email: agentEmail,
				roles: ['agent', 'requests'],
			})
			await assignCompanyToUser({
				userEmail: agentEmail,
				companyDomain: firstDomain,
			})
			await loginPage(page, agentEmail)
			await page.goto('/equipo')

			await expect(
				page.getByRole('navigation', { name: 'Navegación' }),
			).toBeVisible()
			await expect(
				page.getByRole('navigation', { name: 'Administración' }),
			).toHaveCount(0)
		} finally {
			await deleteUserCompanyAssignmentsByEmail([agentEmail])
			await deleteUsersByEmail([agentEmail])
		}
	})
})
