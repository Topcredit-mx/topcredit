import { expect, test } from '@playwright/test'
import type { SeedInstallmentsOverdueResult } from '~/e2e/server/tasks'
import {
	cleanupInstallmentsOverdue,
	seedInstallmentsOverdue,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	installmentsOverdueAgent,
	nonInstallmentsOverdueAgent,
} from './installments-overdue.fixtures'

registerDbSpecGuards()

test.describe('Installments overdue page', () => {
	let seed: SeedInstallmentsOverdueResult

	test.beforeAll(async () => {
		await cleanupInstallmentsOverdue()
		seed = await seedInstallmentsOverdue()
	})

	test.afterAll(async () => {
		await cleanupInstallmentsOverdue()
	})

	test.describe('Installments agent uses the overdue installments page', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, installmentsOverdueAgent.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('shows three installments overview cards above the overdue table', async ({
			page,
		}) => {
			await page.goto('/equipo/installments/overdue')
			await expect(
				page.getByRole('heading', { name: /resumen de instalaciones/i }),
			).toBeVisible()
			await expect(
				page.getByText(/total cobrado \(7 días\)/i).first(),
			).toBeVisible()
			await expect(
				page.getByText(/instalaciones cobradas \(7 días\)/i).first(),
			).toBeVisible()
			await expect(
				page
					.getByText(/antigüedad de la instalación pendiente más antigua/i)
					.first(),
			).toBeVisible()
			await expect(mainDataTable(page)).toBeVisible()
			const { headingBottom, tableTop } = await page.evaluate(() => {
				const h = [...document.querySelectorAll('h2')].find((el) =>
					/resumen de instalaciones/i.test(el.textContent || ''),
				)
				const mainEl = document.querySelector('main')
				const tables = mainEl?.querySelectorAll('table') ?? []
				const t = tables[tables.length - 1] ?? null
				return {
					headingBottom: h?.getBoundingClientRect().bottom ?? 0,
					tableTop: t?.getBoundingClientRect().top ?? 0,
				}
			})
			expect(headingBottom).toBeLessThanOrEqual(tableTop + 2)
		})

		test('shows weekly comparison labels on the overdue page overview cards', async ({
			page,
		}) => {
			await page.goto('/equipo/installments/overdue')
			const overview = page.locator(
				'[aria-labelledby="installments-overview-heading"]',
			)
			await expect(overview).toBeVisible()
			await expect(
				overview.getByText(/vs semana anterior/i).first(),
			).toBeVisible()
		})

		test('shows oldest pending age in days when overdue rows exist', async ({
			page,
		}) => {
			await page.goto('/equipo/installments/overdue')
			const card = page.locator(
				'[data-testid="installments-overview-oldest-pending"]',
			)
			await expect(card.getByText(/\d+ días/i).first()).toBeVisible()
		})

		test('shows overdue credit rows with totals, count, oldest date, and unified Estado', async ({
			page,
		}) => {
			await page.goto('/equipo/installments/overdue')
			await expect(
				page.getByRole('heading', { level: 1, name: /^instalaciones$/i }),
			).toBeVisible()
			const table = mainDataTable(page)
			await expect(table).toBeVisible()
			await table.scrollIntoViewIfNeeded()
			for (const label of [
				/^estado$/i,
				/total atrasado/i,
				/cuotas atrasadas/i,
				/atraso más antiguo/i,
			]) {
				const th = mainDataTable(page)
					.locator('thead th')
					.filter({ hasText: label })
				await th.first().scrollIntoViewIfNeeded()
				await expect(th.first()).toBeVisible()
			}
			const trInst = page.locator('tr', {
				hasText: seed.payrollInstallmentsBlocked,
			})
			await trInst.first().scrollIntoViewIfNeeded()
			await expect(
				trInst.first().getByText(/instalación pendiente/i),
			).toBeVisible()
			const trRh = page.locator('tr', { hasText: seed.payrollHrBlocked })
			await trRh.first().scrollIntoViewIfNeeded()
			await expect(trRh.first().getByText(/RH Pendiente/i)).toBeVisible()
		})

		test('does not list overdue rows on the main installments queue', async ({
			page,
		}) => {
			await page.goto('/equipo/installments')
			await expect(page.getByRole('main')).toBeVisible()
			await expect(
				page.getByText(seed.applicantInstallmentsBlockedName, { exact: true }),
			).toHaveCount(0)
			await expect(
				page.getByText(seed.applicantHrBlockedName, { exact: true }),
			).toHaveCount(0)
		})

		test('bulk-confirms only installments-blocked overdue rows in one action', async ({
			page,
		}) => {
			await page.goto('/equipo/installments/overdue')
			await expect(mainDataTable(page)).toBeVisible()
			await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(
				seed.totalOverdueRowCount,
			)
			await page
				.locator('button[aria-label="Seleccionar todas las filas elegibles"]')
				.click()
			const confirmRe = new RegExp(
				`confirmar ${seed.installmentsBulkConfirmableCount} instalaciones`,
				'i',
			)
			await page.getByRole('button', { name: confirmRe }).first().click()
			const dialog = page.getByRole('dialog')
			await expect(dialog).toBeVisible()
			await dialog.getByRole('button', { name: confirmRe }).click()
			await expect(page.getByRole('dialog')).toHaveCount(0)
			await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(1)
			await expect(
				mainDataTable(page)
					.getByText(seed.payrollHrBlocked, { exact: true })
					.first(),
			).toBeVisible()
			await expect(
				page.getByText(seed.payrollInstallmentsBlocked, { exact: true }),
			).toHaveCount(0)
		})
	})

	test.describe('Agent without installments role cannot open the overdue installments page', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, nonInstallmentsOverdueAgent.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('redirects to unauthorized when visiting the overdue installments page', async ({
			page,
		}) => {
			await page.goto('/equipo/installments/overdue')
			await expect(page).toHaveURL(/\/unauthorized/)
		})
	})
})
