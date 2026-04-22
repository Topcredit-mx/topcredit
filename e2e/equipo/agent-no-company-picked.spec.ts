import { expect, test } from '@playwright/test'
import { cleanupCompanySwitcher, seedCompanySwitcher } from '~/e2e/server/tasks'
import { loginPage } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	agentWithAssignments,
	companyAssignedActive,
} from './company-switcher.fixtures'

registerDbSpecGuards()

test.describe('Agent with no company picked', () => {
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
		await page.context().clearCookies()
		await page.goto('/equipo')
	})

	test('shows multi-scope view with Todas mis empresas when no company is selected', async ({
		page,
	}) => {
		await expect(page.getByText('Todas mis empresas')).toBeVisible()
		await expect(page.getByText('Panel')).toBeVisible()
	})

	test('keeps sidebar navigation enabled so agent can navigate', async ({
		page,
	}) => {
		await page
			.getByRole('navigation', { name: 'Navegación' })
			.getByRole('link', { name: /^Solicitudes$/i })
			.click()
		await expect(page.locator('#applications-status-filter')).toBeVisible()
	})

	test('keeps company switcher enabled so user can pick a company', async ({
		page,
	}) => {
		const trigger = page.locator('#company-switcher-trigger')
		await expect(trigger).toBeVisible()
		await expect(trigger).toBeEnabled()
		await trigger.click()
		await expect(page.locator('[role="menu"]')).toBeVisible()
		await expect(
			page.getByRole('menuitem', { name: companyAssignedActive.name }),
		).toBeVisible()
	})
})
