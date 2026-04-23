import { expect, test } from '@playwright/test'
import type { SeedLoginFlowResult } from '~/e2e/server/tasks'
import { cleanupLoginFlow, seedLoginFlow } from '~/e2e/server/tasks'
import { agentUser, applicantUser } from '../fixtures/login.fixtures'
import { loginPage } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'

registerDbSpecGuards()

let seed: SeedLoginFlowResult

test.beforeAll(async () => {
	seed = await seedLoginFlow()
})

test.afterAll(async () => {
	await cleanupLoginFlow({ termId: seed.termId })
})

test('shows landing page to unauthenticated users', async ({ page }) => {
	await page.goto('/')
	await expect(page).toHaveURL(/\/$/)
	await expect(
		page.getByRole('heading', { name: 'conseguir un crédito' }),
	).toBeVisible()
	await expect(page.getByRole('link', { name: 'Inicia ahora' })).toBeVisible()
})

test('redirects logged-in applicant to cuenta', async ({ page }) => {
	await loginPage(page, applicantUser.email)
	await page.goto('/')
	await expect(
		page.getByRole('heading', { name: /resumen ejecutivo/i }),
	).toBeVisible()
})

test('redirects logged-in agent to app', async ({ page }) => {
	await loginPage(page, agentUser.email)
	await page.goto('/')
	await expect(page.getByText('Sin empresas asignadas')).toBeVisible()
})
