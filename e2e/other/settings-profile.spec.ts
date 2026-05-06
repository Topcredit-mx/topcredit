import { expect, test } from '@playwright/test'
import { cleanupProfile, seedProfile } from '~/e2e/server/tasks'
import { applicantUser } from '../fixtures/login.fixtures'
import { loginPage } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'

const applicantSettingsProfile = '/cuenta/settings/profile'

test.beforeAll(async () => {
	await cleanupProfile()
	await seedProfile()
})

test.afterAll(async () => {
	await cleanupProfile()
})

registerDbSpecGuards()

test('redirects to login when accessing applicant settings profile unauthenticated', async ({
	page,
}) => {
	await page.goto(applicantSettingsProfile)
	await expect(
		page.getByRole('heading', { name: /bienvenido a topcredit/i }),
	).toBeVisible()
})

test('redirects /settings to cuenta settings profile for applicants', async ({
	page,
}) => {
	await loginPage(page, applicantUser.email)
	await page.goto('/settings')
	await expect(
		page.getByRole('heading', { name: 'Configuración' }),
	).toBeVisible()
	await expect(page.getByText('Datos del perfil')).toBeVisible()
})

test('shows profile content when authenticated (applicant shell)', async ({
	page,
}) => {
	await loginPage(page, applicantUser.email)
	await page.goto(applicantSettingsProfile)
	await expect(page.getByText('Datos del perfil')).toBeVisible()
	await expect(
		page.locator('p', { hasText: applicantUser.email }),
	).toBeVisible()
	await expect(page.getByText('Roles asignados')).toBeVisible()
	await expect(
		page.getByText('Solicitante', { exact: true }).first(),
	).toBeVisible()
})

test('shows user name on profile', async ({ page }) => {
	await loginPage(page, applicantUser.email)
	await page.goto(applicantSettingsProfile)
	await expect(page.locator('p', { hasText: applicantUser.name })).toBeVisible()
})
