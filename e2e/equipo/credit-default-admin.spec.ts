import { expect, test } from '@playwright/test'
import type { SeedCreditDefaultAdminResult } from '~/e2e/server/tasks'
import {
	cleanupCreditDefaultAdmin,
	seedCreditDefaultAdmin,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { findTableRow } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	creditDefaultAdminAgent,
	creditDefaultInstallmentsAgent,
} from './credit-default-admin.fixtures'

registerDbSpecGuards()

test.describe('Admin marks long-overdue credit as defaulted from credit detail', () => {
	test.describe.configure({ mode: 'serial' })

	let seed: SeedCreditDefaultAdminResult

	test.beforeAll(async () => {
		await cleanupCreditDefaultAdmin()
		seed = await seedCreditDefaultAdmin()
	})

	test.afterAll(async () => {
		await cleanupCreditDefaultAdmin()
	})

	test('admin always sees the default button; after confirming, status is incobrable and queues no longer list that employee', async ({
		page,
	}) => {
		await loginPage(page, creditDefaultAdminAgent.email)
		await setSelectedCompanyId(page, seed.companyId)

		await page.goto(`/equipo/credits/${seed.defaultTargetCreditId}`)
		await expect(
			page.getByRole('heading', { name: /detalle del crédito/i }),
		).toBeVisible()
		await expect(
			page.getByRole('button', { name: /marcar como incobrable/i }),
		).toBeVisible()

		await page.goto('/equipo/installments/overdue')
		await expect(
			findTableRow(page, seed.defaultTargetApplicantName),
		).toBeVisible()

		await page.goto(`/equipo/credits/${seed.defaultTargetCreditId}`)
		await page.getByRole('button', { name: /marcar como incobrable/i }).click()
		await expect(
			page.getByRole('heading', {
				name: /¿marcar este crédito como incobrable\?/i,
			}),
		).toBeVisible()
		await page.getByRole('button', { name: /^confirmar$/i }).click()
		await expect(
			page.getByText(/crédito marcado como incobrable/i),
		).toBeVisible()
		await expect(
			page.getByRole('status').getByText(/incobrable/i),
		).toBeVisible()

		await page.goto('/equipo/installments/overdue')
		await expect(
			findTableRow(page, seed.defaultTargetApplicantName),
		).toHaveCount(0)
		await expect(
			findTableRow(page, seed.otherOverdueApplicantName),
		).toBeVisible()

		await page.goto('/equipo/deductions/overdue')
		await expect(
			findTableRow(page, seed.defaultTargetApplicantName),
		).toHaveCount(0)
		await expect(
			findTableRow(page, seed.otherOverdueApplicantName),
		).toBeVisible()
	})

	test('installments agent does not see the default button on credit detail', async ({
		page,
	}) => {
		await loginPage(page, creditDefaultInstallmentsAgent.email)
		await setSelectedCompanyId(page, seed.companyId)
		await page.goto(`/equipo/credits/${seed.defaultTargetCreditId}`)
		await expect(
			page.getByRole('heading', { name: /detalle del crédito/i }),
		).toBeVisible()
		await expect(
			page.getByRole('button', { name: /marcar como incobrable/i }),
		).toHaveCount(0)
	})

	test('after defaulting, installments main view has no row for the defaulted employee', async ({
		page,
	}) => {
		await loginPage(page, creditDefaultInstallmentsAgent.email)
		await setSelectedCompanyId(page, seed.companyId)
		await page.goto('/equipo/installments')
		await expect(
			page.getByRole('heading', { name: 'Instalaciones', exact: true }),
		).toBeVisible()
		await expect(
			page
				.getByRole('main')
				.getByText(new RegExp(seed.defaultTargetApplicantName, 'i')),
		).toHaveCount(0)
	})
})
