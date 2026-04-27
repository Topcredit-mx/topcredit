import { expect, test } from '@playwright/test'
import type { SeedCreditDefaultAdminResult } from '~/e2e/server/tasks'
import {
	cleanupCreditDefaultAdmin,
	seedCreditDefaultAdmin,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { findTableRow, mainDataTable } from '../helpers/interactions'
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
		const markDefaulted = page.getByRole('button', {
			name: /marcar como incobrable/i,
		})
		await markDefaulted.scrollIntoViewIfNeeded()
		await markDefaulted.click()
		const markDialog = page.getByRole('alertdialog', {
			name: /¿marcar este crédito como incobrable\?/i,
		})
		await expect(markDialog).toBeVisible()
		await markDialog.getByRole('button', { name: /^confirmar$/i }).click()
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

	test('admin can open the defaulted credits list from the sidebar and see the incobrable row', async ({
		page,
	}) => {
		await loginPage(page, creditDefaultAdminAgent.email)
		await setSelectedCompanyId(page, seed.companyId)
		await page.goto('/equipo')
		await expect(
			page
				.getByRole('navigation', { name: /administración/i })
				.getByRole('link', { name: /créditos incobrables/i }),
		).toBeVisible()
		await page.goto('/equipo/credits/defaulted')
		await expect(
			page.getByRole('heading', { name: /créditos incobrables/i }).first(),
		).toBeVisible()
		await expect(
			mainDataTable(page)
				.getByRole('row', {
					name: new RegExp(seed.defaultTargetApplicantName, 'i'),
				})
				.first(),
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

	test('admin sees danger zone at bottom and can reactivate a defaulted credit to dispersed', async ({
		page,
	}) => {
		await loginPage(page, creditDefaultAdminAgent.email)
		await setSelectedCompanyId(page, seed.companyId)
		await page.goto(`/equipo/credits/${seed.defaultTargetCreditId}`)
		await expect(
			page.getByRole('heading', { name: /zona de riesgo/i }),
		).toBeVisible()
		const reactivate = page.getByRole('button', { name: /reactivar crédito/i })
		await reactivate.scrollIntoViewIfNeeded()
		await expect(reactivate).toBeVisible()
		await expect(
			page.getByRole('button', { name: /marcar como incobrable/i }),
		).toHaveCount(0)

		await reactivate.click()
		const restoreDialog = page.getByRole('alertdialog', {
			name: /¿reactivar este crédito como dispersado\?/i,
		})
		await expect(restoreDialog).toBeVisible()
		await restoreDialog.getByRole('button', { name: /^reactivar$/i }).click()
		await expect(
			page.getByText(/crédito reactivado \(dispersado\)/i),
		).toBeVisible()
		await expect(
			page.getByRole('status').getByText(/dispersado/i),
		).toBeVisible()
	})
})
