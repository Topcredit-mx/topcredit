import { expect, test } from '@playwright/test'
import {
	adminOverviewAdmin,
	overviewCompanyList,
} from '~/e2e/admin/equipo-admin-overview.fixtures'
import { cleanupAdminOverview, seedAdminOverview } from '~/e2e/server/tasks'
import { loginPage } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'

registerDbSpecGuards()

test.describe('Admin company switcher', () => {
	const adminEmail = adminOverviewAdmin.email

	test.beforeAll(async () => {
		await cleanupAdminOverview()
		await seedAdminOverview()
	})

	test.afterAll(async () => {
		await cleanupAdminOverview()
	})

	test.beforeEach(async ({ page }) => {
		await loginPage(page, adminEmail)
		await page.context().clearCookies()
		await page.goto('/equipo')
	})

	const companyAName = overviewCompanyList[0]?.name ?? 'Overview Co A'
	const companyBName = overviewCompanyList[1]?.name ?? 'Overview Co B'

	test('admin sees Vista general option and all active companies in switcher', async ({
		page,
	}) => {
		await page.locator('#company-switcher-trigger').click()

		const menu = page.locator('[role="menu"]')
		await expect(
			menu.getByRole('menuitem', { name: 'Vista general' }),
		).toBeAttached()
		await expect(
			menu.getByRole('menuitem', { name: companyAName }),
		).toBeAttached()
		await expect(
			menu.getByRole('menuitem', { name: companyBName }),
		).toBeAttached()
	})

	test('admin can select a company and sees company name in trigger', async ({
		page,
	}) => {
		await page.locator('#company-switcher-trigger').click()
		await page.getByRole('menuitem', { name: companyAName }).click()

		await expect(page.locator('#company-switcher-trigger')).toContainText(
			companyAName,
		)
	})

	test('selected company persists after page reload', async ({ page }) => {
		await page.locator('#company-switcher-trigger').click()
		await page.getByRole('menuitem', { name: companyBName }).click()

		await expect(page.locator('#company-switcher-trigger')).toContainText(
			companyBName,
		)

		await page.reload()

		await expect(page.locator('#company-switcher-trigger')).toContainText(
			companyBName,
		)
	})

	test('admin can select Vista general to return to equipo overview', async ({
		page,
	}) => {
		await page.locator('#company-switcher-trigger').click()
		await page.getByRole('menuitem', { name: companyAName }).click()

		await expect(page.locator('#company-switcher-trigger')).toContainText(
			companyAName,
		)

		await page.locator('#company-switcher-trigger').click()
		await page.getByRole('menuitem', { name: 'Vista general' }).click()

		await expect(page.locator('#company-switcher-trigger')).toContainText(
			'Vista general',
		)
		await expect(page.getByText('Vista general')).toBeVisible()
		await expect(page.locator('main').getByText('Empresas')).toBeVisible()
	})
})
