import { expect, test } from '@playwright/test'
import { adminOverviewAdmin } from '~/e2e/admin/equipo-admin-overview.fixtures'
import { cleanupAdminOverview, seedAdminOverview } from '~/e2e/server/tasks'
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
})
