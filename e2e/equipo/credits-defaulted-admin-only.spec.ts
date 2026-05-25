import { test } from '@playwright/test'
import type { SeedCreditDefaultAdminResult } from '~/e2e/server/tasks'
import {
	cleanupCreditDefaultAdmin,
	seedCreditDefaultAdmin,
} from '~/e2e/server/tasks'
import { expectAccessDenied } from '../helpers/access-denied'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import { creditDefaultInstallmentsAgent } from './credit-default-admin.fixtures'

registerDbSpecGuards()

test.describe('Defaulted credits list — admin only', () => {
	let seed: SeedCreditDefaultAdminResult

	test.beforeAll(async () => {
		await cleanupCreditDefaultAdmin()
		seed = await seedCreditDefaultAdmin()
	})

	test.afterAll(async () => {
		await cleanupCreditDefaultAdmin()
	})

	test('non-admin is redirected from /equipo/credits/defaulted', async ({
		page,
	}) => {
		await loginPage(page, creditDefaultInstallmentsAgent.email)
		await setSelectedCompanyId(page, seed.companyId)
		await page.goto('/equipo/credits/defaulted')
		await expectAccessDenied(page)
	})
})
