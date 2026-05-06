import { expect, test } from '@playwright/test'
import {
	cleanupSecurity,
	enableTotpForUser,
	resetUser,
	seedSecurity,
} from '~/e2e/server/tasks'
import { applicantUser } from '../fixtures/login.fixtures'
import { loginPage } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'

const applicantSettingsSecurity = '/cuenta/settings/security'

const totpUser = {
	name: 'TOTP User',
	email: 'totp@example.com',
	roles: ['applicant'] as const,
}

test.beforeAll(async () => {
	await cleanupSecurity()
	await seedSecurity()
})

test.afterAll(async () => {
	await cleanupSecurity()
})

registerDbSpecGuards()

test('redirects to login when accessing applicant settings security unauthenticated', async ({
	page,
}) => {
	await page.goto(applicantSettingsSecurity)
	await expect(
		page.getByRole('heading', { name: /bienvenido a topcredit/i }),
	).toBeVisible()
})

test('shows security content when authenticated (applicant shell)', async ({
	page,
}) => {
	await loginPage(page, applicantUser.email)
	await page.goto(applicantSettingsSecurity)
	await expect(
		page.getByRole('heading', { name: 'Configuración' }),
	).toBeVisible()
	await expect(page.getByText('Dirección de correo')).toBeVisible()
	await expect(page.getByText('Cambiar correo')).toBeVisible()
})

test('displays current email on security page', async ({ page }) => {
	await loginPage(page, applicantUser.email)
	await page.goto(applicantSettingsSecurity)
	await expect(
		page.locator('p', { hasText: applicantUser.email }),
	).toBeVisible()
})

test('shows TOTP / two-factor section', async ({ page }) => {
	await loginPage(page, applicantUser.email)
	await page.goto(applicantSettingsSecurity)
	await expect(
		page.getByText('Autenticación de Dos Factores', { exact: true }),
	).toBeVisible()
})

test('shows TOTP-enabled state when user has TOTP setup', async ({ page }) => {
	await enableTotpForUser(totpUser.email)
	await loginPage(page, totpUser.email)
	await page.goto(applicantSettingsSecurity)
	await expect(
		page.getByText('La autenticación de dos factores está habilitada'),
	).toBeVisible()
	const backupText = page.getByText(/Te quedan \d+ códigos de respaldo/)
	await backupText.scrollIntoViewIfNeeded()
	await expect(backupText).toBeVisible()
	await expect(
		page.getByRole('button', { name: 'Regenerar Códigos' }),
	).toBeVisible()
	await expect(page.getByRole('button', { name: 'Deshabilitar' })).toBeVisible()
})

test('shows unverified state and warning for unverified user', async ({
	page,
}) => {
	await resetUser({
		name: applicantUser.name,
		email: applicantUser.email,
		roles: [...applicantUser.roles],
		verified: false,
	})
	await loginPage(page, applicantUser.email)
	await page.goto(applicantSettingsSecurity)
	await expect(page.getByText('No verificado', { exact: true })).toBeVisible()
	await expect(page.getByText('Acción requerida')).toBeVisible()
})

test('shows verified state for verified user', async ({ page }) => {
	await resetUser({
		name: applicantUser.name,
		email: applicantUser.email,
		roles: [...applicantUser.roles],
		verified: true,
	})
	await loginPage(page, applicantUser.email)
	await page.goto(applicantSettingsSecurity)
	await expect(page.getByText('Verificado el')).toBeVisible()
})
