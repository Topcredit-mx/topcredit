import { expect, test } from '@playwright/test'
import { cleanupCompanySwitcher, seedCompanySwitcher } from '~/e2e/server/tasks'
import { loginPage } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	agentWithAssignments,
	companyAssignedActive,
	companyAssignedActive2,
	companyAssignedInactive,
	companyUnassigned,
} from './company-switcher.fixtures'

registerDbSpecGuards()

test.describe('Company Switcher', () => {
	const agentEmail = agentWithAssignments.email

	test.beforeAll(async () => {
		await cleanupCompanySwitcher()
		await seedCompanySwitcher()
	})

	test.afterAll(async () => {
		await cleanupCompanySwitcher()
	})

	test.beforeEach(async ({ page }) => {
		await loginPage(page, agentEmail)
		await page.goto('/equipo')
	})

	test('sidebar shows company switcher with only assigned active companies', async ({
		page,
	}) => {
		await page.locator('#company-switcher-trigger').click()
		const menu = page.locator('[role="menu"]')
		await expect(
			menu.getByRole('menuitem', { name: companyAssignedActive.name }),
		).toBeAttached()
		await expect(
			menu.getByRole('menuitem', { name: companyAssignedActive2.name }),
		).toBeAttached()
		await expect(menu.getByText(companyAssignedInactive.name)).toHaveCount(0)
		await expect(menu.getByText(companyUnassigned.name)).toHaveCount(0)
	})

	test('assigned inactive company is not shown in switcher', async ({
		page,
	}) => {
		await page.locator('#company-switcher-trigger').click()
		const menu = page.locator('[role="menu"]')
		await expect(menu.getByText(companyAssignedInactive.name)).toHaveCount(0)
	})

	test('agent can switch between assigned companies', async ({ page }) => {
		await page.locator('#company-switcher-trigger').click()
		await page
			.getByRole('menuitem', { name: companyAssignedActive.name })
			.click()
		await expect(page.locator('#company-switcher-trigger')).toContainText(
			companyAssignedActive.name,
		)
	})

	test('unassigned company is not visible in switcher', async ({ page }) => {
		await page.locator('#company-switcher-trigger').click()
		await expect(page.locator('[role="menu"]')).toBeVisible()
		await expect(
			page.locator('[role="menu"]').getByText(companyUnassigned.name),
		).toHaveCount(0)
	})

	test('selected company persists after page reload', async ({ page }) => {
		await page.locator('#company-switcher-trigger').click()
		await page
			.getByRole('menuitem', { name: companyAssignedActive2.name })
			.click()
		await expect(page.locator('#company-switcher-trigger')).toContainText(
			companyAssignedActive2.name,
		)
		await page.reload()
		await expect(page.locator('#company-switcher-trigger')).toContainText(
			companyAssignedActive2.name,
		)
	})
})
