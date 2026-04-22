import { expect, type Page, test } from '@playwright/test'
import type { SeedRoleQueueNavResult } from '~/e2e/server/tasks'
import { cleanupRoleQueueNav, seedRoleQueueNav } from '~/e2e/server/tasks'
import { loginPage } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	authorizationsAgent,
	dualQueueAgent,
	hrAgent,
	installmentAgent,
	preAuthAgent,
	requestsAgent,
} from './role-queue-nav.fixtures'

registerDbSpecGuards()

test.describe('Role-based queue navigation', () => {
	let seed: SeedRoleQueueNavResult

	test.beforeAll(async () => {
		await cleanupRoleQueueNav()
		seed = await seedRoleQueueNav()
	})

	test.afterAll(async () => {
		await cleanupRoleQueueNav()
	})

	function navScope(page: Page) {
		return page.getByRole('navigation', { name: 'Navegación' })
	}

	async function loginWithCompany(page: Page, email: string): Promise<void> {
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
		await page.goto('/equipo')
		await expect(navScope(page)).toBeVisible()
	}

	test.describe('Requests agent', () => {
		test.beforeEach(async ({ page }) => {
			await loginWithCompany(page, requestsAgent.email)
		})

		test('sees Solicitudes nav link pointing to pending filter', async ({
			page,
		}) => {
			const nav = navScope(page)
			const link = nav.getByRole('link', { name: 'Solicitudes', exact: true })
			await expect(link).toBeVisible()
			await expect(link).toHaveAttribute(
				'href',
				'/equipo/applications?status=pending',
			)
		})

		test('does not see Pre-autorizaciones or Autorizaciones nav links', async ({
			page,
		}) => {
			const nav = navScope(page)
			await expect(
				nav.getByRole('link', { name: 'Pre-autorizaciones', exact: true }),
			).toHaveCount(0)
			await expect(
				nav.getByRole('link', { name: 'Autorizaciones', exact: true }),
			).toHaveCount(0)
		})
	})

	test.describe('Pre-authorizations agent', () => {
		test.beforeEach(async ({ page }) => {
			await loginWithCompany(page, preAuthAgent.email)
		})

		test('sees Pre-autorizaciones nav link pointing to approved filter', async ({
			page,
		}) => {
			const nav = navScope(page)
			const link = nav.getByRole('link', {
				name: 'Pre-autorizaciones',
				exact: true,
			})
			await expect(link).toBeVisible()
			await expect(link).toHaveAttribute(
				'href',
				'/equipo/applications?status=approved',
			)
		})

		test('does not see Solicitudes or Autorizaciones nav links', async ({
			page,
		}) => {
			const nav = navScope(page)
			await expect(
				nav.getByRole('link', { name: 'Solicitudes', exact: true }),
			).toHaveCount(0)
			await expect(
				nav.getByRole('link', { name: 'Autorizaciones', exact: true }),
			).toHaveCount(0)
		})
	})

	test.describe('Authorizations agent', () => {
		test.beforeEach(async ({ page }) => {
			await loginWithCompany(page, authorizationsAgent.email)
		})

		test('sees Autorizaciones nav link pointing to awaiting-authorization filter', async ({
			page,
		}) => {
			const nav = navScope(page)
			const link = nav.getByRole('link', {
				name: 'Autorizaciones',
				exact: true,
			})
			await expect(link).toBeVisible()
			await expect(link).toHaveAttribute(
				'href',
				'/equipo/applications?status=awaiting-authorization',
			)
		})

		test('does not see Solicitudes or Pre-autorizaciones nav links', async ({
			page,
		}) => {
			const nav = navScope(page)
			await expect(
				nav.getByRole('link', { name: 'Solicitudes', exact: true }),
			).toHaveCount(0)
			await expect(
				nav.getByRole('link', { name: 'Pre-autorizaciones', exact: true }),
			).toHaveCount(0)
		})
	})

	test.describe('HR agent', () => {
		test.beforeEach(async ({ page }) => {
			await loginWithCompany(page, hrAgent.email)
		})

		test('sees Solicitudes RH nav link pointing to authorized + hrPending filter', async ({
			page,
		}) => {
			const nav = navScope(page)
			const link = nav.getByRole('link', { name: 'Solicitudes RH' })
			await expect(link).toBeVisible()
			await expect(link).toHaveAttribute(
				'href',
				'/equipo/applications?status=authorized&hrPending=true',
			)
		})

		test('sees Deducciones nav group with a link to /equipo/deductions', async ({
			page,
		}) => {
			const nav = navScope(page)
			await nav.getByRole('button', { name: 'Deducciones' }).click()
			const link = nav.getByRole('link', { name: 'Próximo Corte' })
			await expect(link).toBeVisible()
			await expect(link).toHaveAttribute('href', '/equipo/deductions')
		})

		test('does not see Solicitudes, Pre-autorizaciones, or Autorizaciones nav links', async ({
			page,
		}) => {
			const nav = navScope(page)
			await expect(
				nav.getByRole('link', { name: 'Solicitudes', exact: true }),
			).toHaveCount(0)
			await expect(
				nav.getByRole('link', { name: 'Pre-autorizaciones', exact: true }),
			).toHaveCount(0)
			await expect(
				nav.getByRole('link', { name: 'Autorizaciones', exact: true }),
			).toHaveCount(0)
		})
	})

	test.describe('Installments agent', () => {
		test.beforeEach(async ({ page }) => {
			await loginWithCompany(page, installmentAgent.email)
		})

		test('sees Instalaciones nav group with a link to /equipo/installments', async ({
			page,
		}) => {
			const nav = navScope(page)
			await nav.getByRole('button', { name: 'Instalaciones' }).click()
			const link = nav.getByRole('link', { name: 'Próximo Corte' })
			await expect(link).toBeVisible()
			await expect(link).toHaveAttribute('href', '/equipo/installments')
		})

		test('does not see Solicitudes RH, Deducciones, or other application nav links', async ({
			page,
		}) => {
			const nav = navScope(page)
			await expect(
				nav.getByRole('link', { name: 'Solicitudes RH' }),
			).toHaveCount(0)
			await expect(nav.getByRole('link', { name: 'Deducciones' })).toHaveCount(
				0,
			)
			await expect(
				nav.getByRole('link', { name: 'Solicitudes', exact: true }),
			).toHaveCount(0)
			await expect(
				nav.getByRole('link', { name: 'Pre-autorizaciones', exact: true }),
			).toHaveCount(0)
			await expect(
				nav.getByRole('link', { name: 'Autorizaciones', exact: true }),
			).toHaveCount(0)
		})
	})

	test.describe('Dual queue agent (requests + authorizations)', () => {
		test.beforeEach(async ({ page }) => {
			await loginWithCompany(page, dualQueueAgent.email)
		})

		test('sees both Solicitudes and Autorizaciones nav links', async ({
			page,
		}) => {
			const nav = navScope(page)
			const sol = nav.getByRole('link', { name: 'Solicitudes', exact: true })
			await expect(sol).toBeVisible()
			await expect(sol).toHaveAttribute(
				'href',
				'/equipo/applications?status=pending',
			)
			const authz = nav.getByRole('link', {
				name: 'Autorizaciones',
				exact: true,
			})
			await expect(authz).toBeVisible()
			await expect(authz).toHaveAttribute(
				'href',
				'/equipo/applications?status=awaiting-authorization',
			)
		})

		test('does not see Pre-autorizaciones nav link', async ({ page }) => {
			const nav = navScope(page)
			await expect(
				nav.getByRole('link', { name: 'Pre-autorizaciones', exact: true }),
			).toHaveCount(0)
		})
	})
})
