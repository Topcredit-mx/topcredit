import { expect, type Page, test } from '@playwright/test'
import type {
	SeedDisbursementReviewResult,
	SeedRoleQueueNavResult,
} from '~/e2e/server/tasks'
import {
	cleanupDisbursementReview,
	cleanupRoleQueueNav,
	seedDisbursementReview,
	seedRoleQueueNav,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import { dispersionsAgent } from './disbursement-agents.fixtures'
import {
	authorizationsAgent,
	dualQueueAgent,
	hrAgent,
	preAuthAgent,
	requestsAgent,
} from './role-queue-nav.fixtures'

registerDbSpecGuards()

test.describe('Dedicated queue screens', () => {
	let seed: SeedRoleQueueNavResult

	test.beforeAll(async () => {
		await cleanupRoleQueueNav()
		seed = await seedRoleQueueNav()
	})

	test.afterAll(async () => {
		await cleanupRoleQueueNav()
	})

	async function loginWithCompany(page: Page, email: string) {
		await loginPage(page, email)
		await page.context().addCookies([
			{
				name: 'selected_company_id',
				value: String(seed.companyId),
				domain: 'localhost',
				path: '/',
				httpOnly: false,
				sameSite: 'Lax',
			},
		])
	}

	test('Solicitudes screen shows its own title', async ({ page }) => {
		await loginWithCompany(page, requestsAgent.email)
		await page.goto('/equipo/applications/queues/solicitudes')
		await expect(
			page.getByRole('heading', { name: 'Solicitudes', exact: true }),
		).toBeVisible()
	})

	test('Pre-autorizaciones screen shows its own title', async ({ page }) => {
		await loginWithCompany(page, preAuthAgent.email)
		await page.goto('/equipo/applications/queues/pre-autorizaciones')
		await expect(
			page.getByRole('heading', { name: 'Pre-autorizaciones', exact: true }),
		).toBeVisible()
	})

	test('Autorizaciones screen shows its own title', async ({ page }) => {
		await loginWithCompany(page, authorizationsAgent.email)
		await page.goto('/equipo/applications/queues/autorizaciones')
		await expect(
			page.getByRole('heading', { name: 'Autorizaciones', exact: true }),
		).toBeVisible()
	})

	test('Solicitudes RH screen shows its own title', async ({ page }) => {
		await loginWithCompany(page, hrAgent.email)
		await page.goto('/equipo/applications/queues/solicitudes-rh')
		await expect(
			page.getByRole('heading', { name: 'Solicitudes RH', exact: true }),
		).toBeVisible()
	})

	test('dual-role agent navigates between Solicitudes and Autorizaciones screens', async ({
		page,
	}) => {
		await loginWithCompany(page, dualQueueAgent.email)
		await page.goto('/equipo/applications/queues/solicitudes')
		await expect(
			page.getByRole('heading', { name: 'Solicitudes', exact: true }),
		).toBeVisible()
		const nav = page.getByRole('navigation', { name: 'Navegación' })
		await nav.getByRole('link', { name: 'Autorizaciones', exact: true }).click()
		await expect(
			page.getByRole('heading', { name: 'Autorizaciones', exact: true }),
		).toBeVisible()
		await nav.getByRole('link', { name: 'Solicitudes', exact: true }).click()
		await expect(
			page.getByRole('heading', { name: 'Solicitudes', exact: true }),
		).toBeVisible()
	})
})

test.describe('Dispersiones queue screen title', () => {
	let seed: SeedDisbursementReviewResult

	test.beforeAll(async () => {
		await cleanupDisbursementReview()
		seed = await seedDisbursementReview()
	})

	test.afterAll(async () => {
		await cleanupDisbursementReview()
	})

	test('shows Dispersiones heading', async ({ page }) => {
		await loginPage(page, dispersionsAgent.email)
		await setSelectedCompanyId(page, seed.companyId)
		await page.goto('/equipo/applications/queues/dispersiones')
		await expect(
			page.getByRole('heading', { name: 'Dispersiones', exact: true }),
		).toBeVisible()
	})
})
