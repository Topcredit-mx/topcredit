import { expect, test } from '@playwright/test'
import type { SeedLoginFlowResult } from '~/e2e/server/tasks'
import {
	cleanupLoginFlow,
	resetApplicantApplication,
	resetUser,
	seedLoginFlow,
} from '~/e2e/server/tasks'
import {
	agentUser,
	applicantUser,
	noRoleUser,
} from '../fixtures/login.fixtures'
import { loginPage } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'

let seed: SeedLoginFlowResult

test.beforeAll(async () => {
	seed = await seedLoginFlow()
})

test.afterAll(async () => {
	await cleanupLoginFlow({ termId: seed.termId })
})

registerDbSpecGuards()

test('accesses applicant cuenta after login', async ({ page }) => {
	await loginPage(page, applicantUser.email)
	await page.goto('/cuenta')
	await expect(
		page.getByRole('heading', { name: /resumen ejecutivo/i }),
	).toBeVisible()
})

test('redirects to cuenta from /login when authenticated', async ({ page }) => {
	await loginPage(page, applicantUser.email)
	await page.goto('/login')
	await expect(
		page.getByRole('heading', { name: /resumen ejecutivo/i }),
	).toBeVisible()
})

test('redirects to cuenta from / when authenticated', async ({ page }) => {
	await loginPage(page, applicantUser.email)
	await page.goto('/')
	await expect(
		page.getByRole('heading', { name: /resumen ejecutivo/i }),
	).toBeVisible()
})

test('shows unauthorized page when applicant tries to access app', async ({
	page,
}) => {
	await loginPage(page, applicantUser.email)
	await page.goto('/equipo')
	await expect(
		page.getByRole('heading', { name: '403 - No Autorizado' }),
	).toBeVisible()
})

test('allows agent to access app routes', async ({ page }) => {
	await loginPage(page, agentUser.email)
	await page.goto('/equipo')
	await expect(page.getByText('Sin empresas asignadas')).toBeVisible()
})

test('shows unauthorized page when agent tries to access cuenta', async ({
	page,
}) => {
	await loginPage(page, agentUser.email)
	await page.goto('/cuenta')
	await expect(
		page.getByRole('heading', { name: '403 - No Autorizado' }),
	).toBeVisible()
})

test('redirects user with no roles to settings from / and /login, blocks /equipo and /cuenta', async ({
	page,
}) => {
	await loginPage(page, noRoleUser.email)
	await page.goto('/')
	await expect(page.getByText('Ningún rol asignado')).toBeVisible()

	await loginPage(page, noRoleUser.email)
	await page.goto('/login')
	await expect(page.getByText('Ningún rol asignado')).toBeVisible()

	await loginPage(page, noRoleUser.email)
	await page.goto('/equipo')
	await expect(
		page.getByRole('heading', { name: '403 - No Autorizado' }),
	).toBeVisible()

	await loginPage(page, noRoleUser.email)
	await page.goto('/cuenta')
	await expect(
		page.getByRole('heading', { name: '403 - No Autorizado' }),
	).toBeVisible()

	await loginPage(page, noRoleUser.email)
	await page.goto('/settings')
	await expect(page.getByText('Ningún rol asignado')).toBeVisible()
})

test('does not allow access to /settings when unauthenticated', async ({
	page,
}) => {
	await page.goto('/settings')
	await expect(
		page.getByRole('heading', { name: /bienvenido a topcredit/i }),
	).toBeVisible()
})

test.describe('Full UI login', () => {
	test('logs in via login → verify-otp with OTP code', async ({ page }) => {
		const code = process.env.E2E_OTP_CODE
		if (!code || code.length !== 6) {
			test.skip()
			return
		}
		await page.goto('/login')
		await page.locator('input[name="email"]').fill(applicantUser.email)
		await page.locator('form').evaluate((form) => {
			if (form instanceof HTMLFormElement) {
				form.requestSubmit()
			}
		})
		await expect(
			page.getByRole('heading', { name: 'Verificación' }),
		).toBeVisible()
		await expect(page.getByText(applicantUser.email)).toBeVisible()
		await page.locator('input[autocomplete="one-time-code"]').fill(code)
		await expect(
			page.getByRole('heading', { name: /resumen ejecutivo/i }),
		).toBeVisible()
	})

	test('shows invalid code when wrong OTP entered', async ({ page }) => {
		const code = process.env.E2E_OTP_CODE
		if (!code || code.length !== 6) {
			test.skip()
			return
		}
		await page.goto('/login')
		await page.locator('input[name="email"]').fill(applicantUser.email)
		await page.locator('form').evaluate((form) => {
			if (form instanceof HTMLFormElement) {
				form.requestSubmit()
			}
		})
		await expect(
			page.getByRole('heading', { name: 'Verificación' }),
		).toBeVisible()
		await page.locator('input[autocomplete="one-time-code"]').fill('111111')
		await expect(
			page.getByText(/invalid|inválido|inválida|código otp/i),
		).toBeVisible()
		await expect(
			page.getByRole('heading', { name: 'Verificación' }),
		).toBeVisible()
	})
})

test.describe('Email verification (cuenta / equipo)', () => {
	test('applicant cuenta: unverified user sees verification warning', async ({
		page,
	}) => {
		await resetUser({
			name: applicantUser.name,
			email: applicantUser.email,
			roles: [...applicantUser.roles],
			verified: false,
		})
		await resetApplicantApplication({
			applicantId: seed.applicantId,
			termOfferingId: seed.termOfferingId,
			creditAmount: '10000',
			salaryAtApplication: '100000',
		})
		await loginPage(page, applicantUser.email)
		await page.goto('/cuenta')
		await expect(page.getByText(/Verifica tu correo en/i)).toBeVisible()
	})

	test('applicant cuenta: verified user does not see verification warning', async ({
		page,
	}) => {
		await resetUser({
			name: applicantUser.name,
			email: applicantUser.email,
			roles: [...applicantUser.roles],
			verified: true,
		})
		await loginPage(page, applicantUser.email)
		await page.goto('/cuenta')
		await expect(page.getByText(/Verifica tu correo en/i)).toHaveCount(0)
	})

	test('agent app: unverified user sees verification warning in sidebar', async ({
		page,
	}) => {
		await resetUser({
			name: agentUser.name,
			email: agentUser.email,
			roles: [...agentUser.roles],
			verified: false,
		})
		await loginPage(page, agentUser.email)
		await page.goto('/equipo')
		await expect(page.getByText('Correo no verificado.')).toBeVisible()
	})

	test('agent app: verified user does not see verification warning', async ({
		page,
	}) => {
		await resetUser({
			name: agentUser.name,
			email: agentUser.email,
			roles: [...agentUser.roles],
			verified: true,
		})
		await loginPage(page, agentUser.email)
		await page.goto('/equipo')
		await expect(page.getByText('Correo no verificado.')).toHaveCount(0)
	})
})
