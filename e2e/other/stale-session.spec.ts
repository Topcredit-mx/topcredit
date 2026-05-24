import { expect, type Page, test } from '@playwright/test'
import type { SeedStaleSessionResult } from '~/e2e/server/tasks'
import {
	cleanupStaleSession,
	deleteUsersByEmail,
	getUserIdByEmail,
	nukeMigrateDb,
	resetApplicantApplication,
	resetUser,
	seedStaleSession,
} from '~/e2e/server/tasks'
import { expectSignedOutOnLogin, loginPage } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	staleSessionAdmin,
	staleSessionAgent,
	staleSessionApplicant,
	staleSessionUsers,
} from './stale-session.fixtures'

let seed: SeedStaleSessionResult

test.beforeAll(async () => {
	seed = await seedStaleSession()
})

test.beforeEach(async () => {
	for (const user of staleSessionUsers) {
		await resetUser({
			name: user.name,
			email: user.email,
			roles: [...user.roles],
			verified: true,
		})
	}

	const applicantId = await getUserIdByEmail(staleSessionApplicant.email)
	if (applicantId == null) {
		throw new Error('Stale session seed: applicant user missing')
	}

	await resetApplicantApplication({
		applicantId,
		termOfferingId: seed.termOfferingId,
		creditAmount: '10000',
		salaryAtApplication: '100000',
	})
})

test.afterAll(async () => {
	await cleanupStaleSession({ termId: seed.termId })
})

registerDbSpecGuards()

async function loginAndVisitHome(page: Page, email: string) {
	await loginPage(page, email)
	await page.goto('/')
}

test.describe('Stale session after user deleted from backend', () => {
	test('admin: refresh /equipo clears session and shows login', async ({
		page,
	}) => {
		await loginAndVisitHome(page, staleSessionAdmin.email)
		await expect(
			page.getByRole('heading', { name: /vista general/i }),
		).toBeVisible()

		await deleteUsersByEmail([staleSessionAdmin.email])
		await page.reload()

		await expectSignedOutOnLogin(page)
	})

	test('admin: loading /cuenta clears session and shows login', async ({
		page,
	}) => {
		await loginAndVisitHome(page, staleSessionAdmin.email)
		await expect(
			page.getByRole('heading', { name: /vista general/i }),
		).toBeVisible()

		await deleteUsersByEmail([staleSessionAdmin.email])
		await page.goto('/cuenta')

		await expectSignedOutOnLogin(page)
	})

	test('applicant: refresh /cuenta clears session and shows login', async ({
		page,
	}) => {
		await loginAndVisitHome(page, staleSessionApplicant.email)
		await expect(
			page.getByRole('heading', { name: /resumen ejecutivo/i }),
		).toBeVisible()

		await deleteUsersByEmail([staleSessionApplicant.email])
		await page.reload()

		await expectSignedOutOnLogin(page)
	})

	test('applicant: loading /equipo clears session and shows login', async ({
		page,
	}) => {
		await loginAndVisitHome(page, staleSessionApplicant.email)
		await expect(
			page.getByRole('heading', { name: /resumen ejecutivo/i }),
		).toBeVisible()

		await deleteUsersByEmail([staleSessionApplicant.email])
		await page.goto('/equipo')

		await expectSignedOutOnLogin(page)
	})

	test('agent: refresh /equipo clears session and shows login', async ({
		page,
	}) => {
		await loginAndVisitHome(page, staleSessionAgent.email)
		await expect(page.getByText('Sin empresas asignadas')).toBeVisible()

		await deleteUsersByEmail([staleSessionAgent.email])
		await page.reload()

		await expectSignedOutOnLogin(page)
	})

	test('agent: loading /cuenta clears session and shows login', async ({
		page,
	}) => {
		await loginAndVisitHome(page, staleSessionAgent.email)
		await expect(page.getByText('Sin empresas asignadas')).toBeVisible()

		await deleteUsersByEmail([staleSessionAgent.email])
		await page.goto('/cuenta')

		await expectSignedOutOnLogin(page)
	})
})

test.describe('Stale session after db nuke migrate and re-seed', () => {
	test('admin: refresh /equipo clears session and shows login', async ({
		page,
	}) => {
		await loginAndVisitHome(page, staleSessionAdmin.email)
		await page.goto('/equipo/applications')
		await expect(
			page.getByRole('heading', { name: /solicitudes/i }),
		).toBeVisible()

		await nukeMigrateDb()
		await seedStaleSession()

		await page.reload()
		await expectSignedOutOnLogin(page)
	})

	test('applicant: refresh /cuenta clears session and shows login', async ({
		page,
	}) => {
		await loginAndVisitHome(page, staleSessionApplicant.email)
		await expect(
			page.getByRole('heading', { name: /resumen ejecutivo/i }),
		).toBeVisible()

		await nukeMigrateDb()
		await seedStaleSession()

		await page.reload()
		await expectSignedOutOnLogin(page)
	})
})
