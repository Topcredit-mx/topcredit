import { expect, test } from '@playwright/test'
import {
	cleanupAgentNoAssignments,
	seedAgentNoAssignments,
} from '~/e2e/server/tasks'
import { loginPage } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import { agentNoAssignments } from './agent-no-assignments.fixtures'

registerDbSpecGuards()

test.describe('Agent without assignments', () => {
	const email = agentNoAssignments.email

	test.beforeAll(async () => {
		await cleanupAgentNoAssignments()
		await seedAgentNoAssignments()
	})

	test.afterAll(async () => {
		await cleanupAgentNoAssignments()
	})

	test.beforeEach(async ({ page }) => {
		await loginPage(page, email)
	})

	test('shows empty state message when agent has no company assignments', async ({
		page,
	}) => {
		await page.goto('/equipo')
		await expect(page.getByText('Sin empresas asignadas')).toBeVisible()
		await expect(page.getByText('Contacta a un administrador')).toBeVisible()
	})

	test('does not show company data - main content is empty state only', async ({
		page,
	}) => {
		await page.goto('/equipo')
		await expect(
			page.locator('main').getByText('Sin empresas asignadas'),
		).toBeVisible()
	})
})
