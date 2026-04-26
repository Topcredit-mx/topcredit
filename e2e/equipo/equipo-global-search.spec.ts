import { expect, test } from '@playwright/test'
import type { SeedCreditDetailPaymentStatesResult } from '~/e2e/server/tasks'
import {
	cleanupCreditDetailPaymentStates,
	seedCreditDetailPaymentStates,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	creditDetailStatesApplicant,
	creditDetailStatesHrAgent,
	creditDetailStatesPendingOnlyApplicant,
} from './credit-detail-states.fixtures'

registerDbSpecGuards()

test.describe('Equipo global search (Command+K)', () => {
	let seed: SeedCreditDetailPaymentStatesResult

	test.beforeAll(async () => {
		await cleanupCreditDetailPaymentStates()
		seed = await seedCreditDetailPaymentStates()
	})

	test.afterAll(async () => {
		await cleanupCreditDetailPaymentStates()
	})

	test.beforeEach(async ({ page }) => {
		await loginPage(page, creditDetailStatesHrAgent.email)
		await setSelectedCompanyId(page, seed.companyId)
	})

	test('shows shortcut hint in the header', async ({ page }) => {
		await page.goto('/equipo')
		await expect(page.getByRole('main')).toBeVisible()
		await expect(
			page.getByText(/Busca solicitudes y créditos por nombre o correo/i),
		).toBeVisible()
		await expect(page.getByText(/Ctrl\+K/i)).toBeVisible()
	})

	test('after Ctrl+K, search by applicant name shows application and credit links', async ({
		page,
	}) => {
		await page.goto('/equipo')
		await page.keyboard.press('Control+K')
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		await dialog
			.getByLabel(/Buscar por nombre o correo/i)
			.fill('Applicant Credit States')
		await expect(
			dialog.getByText(creditDetailStatesApplicant.name, { exact: true }),
		).toBeVisible()
		await expect(
			dialog.getByRole('link', {
				name: new RegExp(`Solicitud #${seed.applicationId}`),
			}),
		).toBeVisible()
		await expect(
			dialog.getByRole('link', {
				name: new RegExp(`Crédito #${seed.creditId}`),
			}),
		).toBeVisible()
	})

	test('after Ctrl+K, search by email shows application and credit links and opens application detail', async ({
		page,
	}) => {
		await page.goto('/equipo')
		await page.keyboard.press('Control+K')
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		await dialog
			.getByLabel(/Buscar por nombre o correo/i)
			.fill(creditDetailStatesApplicant.email)
		await expect(
			dialog.getByText(creditDetailStatesApplicant.name, { exact: true }),
		).toBeVisible()
		await expect(dialog.getByText(/Dispersado/i).first()).toBeVisible()
		await expect(dialog.getByText(/Liquidado/i)).toHaveCount(0)
		const appLink = dialog.getByRole('link', {
			name: new RegExp(`Solicitud #${seed.applicationId}`),
		})
		const creditLink = dialog.getByRole('link', {
			name: new RegExp(`Crédito #${seed.creditId}`),
		})
		await expect(appLink).toBeVisible()
		await expect(creditLink).toBeVisible()
		await appLink.click()
		await expect(
			page.getByRole('heading', { name: /detalle de solicitud/i }),
		).toBeVisible()
	})

	test('after Ctrl+K, search finds pending application without credit link', async ({
		page,
	}) => {
		await page.goto('/equipo')
		await page.keyboard.press('Control+K')
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		await dialog
			.getByLabel(/Buscar por nombre o correo/i)
			.fill(creditDetailStatesPendingOnlyApplicant.email)
		await expect(
			dialog.getByText(creditDetailStatesPendingOnlyApplicant.name, {
				exact: true,
			}),
		).toBeVisible()
		await expect(dialog.getByText(/Pendiente/i).first()).toBeVisible()
		await expect(
			dialog.getByRole('link', {
				name: new RegExp(`Solicitud #${seed.pendingOnlyApplicationId}`),
			}),
		).toBeVisible()
		await expect(dialog.getByRole('link', { name: /Crédito #/ })).toHaveCount(0)
		await dialog
			.getByRole('link', {
				name: new RegExp(`Solicitud #${seed.pendingOnlyApplicationId}`),
			})
			.click()
		await expect(
			page.getByRole('heading', { name: /detalle de solicitud/i }),
		).toBeVisible()
	})

	test('after Ctrl+K, credit link opens credit detail', async ({ page }) => {
		await page.goto('/equipo')
		await page.keyboard.press('Control+K')
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		await dialog
			.getByLabel(/Buscar por nombre o correo/i)
			.fill(creditDetailStatesApplicant.email)
		await dialog
			.getByRole('link', { name: new RegExp(`Crédito #${seed.creditId}`) })
			.click()
		await expect(
			page.getByRole('heading', { name: /detalle del crédito/i }),
		).toBeVisible()
	})
})
