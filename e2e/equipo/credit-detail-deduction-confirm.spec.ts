import { expect, test } from '@playwright/test'
import type {
	SeedCreditDetailPaymentStatesResult,
	SeedDeductionsQueueResult,
} from '~/e2e/server/tasks'
import {
	cleanupCreditDetailPaymentStates,
	cleanupDeductionsQueue,
	seedCreditDetailPaymentStates,
	seedDeductionsQueue,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import { creditDetailStatesHrAgent } from './credit-detail-states.fixtures'
import {
	hrAgentDeductions,
	installmentsAgentDeductions,
	nonHrAgentDeductions,
} from './deductions-queue.fixtures'

registerDbSpecGuards()

test.describe('HR credit detail — deduction confirmation', () => {
	let seed: SeedDeductionsQueueResult

	test.beforeAll(async () => {
		await cleanupDeductionsQueue()
		seed = await seedDeductionsQueue(null)
	})

	test.afterAll(async () => {
		await cleanupDeductionsQueue()
	})

	test.describe('HR agent with company selected', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, hrAgentDeductions.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('shows the credit detail page with payment schedule', async ({
			page,
		}) => {
			await page.goto(`/equipo/credits/${seed.credit1Id}`)
			await expect(
				page.getByRole('heading', { name: /detalle del crédito/i }),
			).toBeVisible()
			await expect(
				page.getByText(seed.applicant1Name, { exact: true }).first(),
			).toBeVisible()
			await expect(mainDataTable(page)).toBeVisible()
		})

		test('shows installment rows with HR deduction status badges', async ({
			page,
		}) => {
			await page.goto(`/equipo/credits/${seed.credit1Id}`)
			await expect(mainDataTable(page)).toBeVisible()
			const n = await mainDataTable(page).locator('tbody tr').count()
			expect(n).toBeGreaterThanOrEqual(1)
			const first = mainDataTable(page).locator('tbody tr').first()
			await expect(first.getByText(/pendiente|atrasado/i).first()).toBeVisible()
		})

		test('shows a confirm button for unconfirmed installments', async ({
			page,
		}) => {
			await page.goto(`/equipo/credits/${seed.credit1Id}`)
			await expect(mainDataTable(page)).toBeVisible()
			const first = mainDataTable(page).locator('tbody tr').first()
			await expect(
				first.getByRole('button', { name: /confirmar/i }),
			).toBeVisible()
		})

		test('shows a back link to the credits list', async ({ page }) => {
			await page.goto(`/equipo/credits/${seed.credit1Id}`)
			await expect(
				page.getByRole('heading', { name: /detalle del crédito/i }),
			).toBeVisible()
			await expect(
				page.getByRole('link', { name: /volver a créditos/i }),
			).toBeVisible()
		})

		test('credit detail links to the related application and shows schedule', async ({
			page,
		}) => {
			await page.goto(`/equipo/credits/${seed.credit1Id}`)
			const appLink = page.getByRole('link', { name: /ver solicitud/i })
			await expect(appLink).toBeVisible()
			await expect(appLink).toHaveAttribute(
				'href',
				`/equipo/applications/${seed.application1Id}`,
			)
			await expect(
				page.getByRole('heading', { name: /calendario de pagos/i }),
			).toBeVisible()
			await expect(page.getByText(/deduct001/i)).toBeVisible()
			await expect(page.getByText(/monto dispersado/i)).toBeVisible()
			await expect(page.getByText(/4 meses/i)).toBeVisible()
			await page.goto(`/equipo/applications/${seed.application1Id}`)
			await expect(
				page.getByRole('heading', { name: /detalle de solicitud/i }),
			).toBeVisible()
			const creditLink = page.getByRole('link', {
				name: /ver crédito dispersado/i,
			})
			await expect(creditLink).toBeVisible()
			await expect(creditLink).toHaveAttribute(
				'href',
				`/equipo/credits/${seed.credit1Id}`,
			)
		})

		test('shows the employee name as a link in the deductions queue', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions')
			await expect(mainDataTable(page)).toBeVisible()
			const link = page.locator(`a[href="/equipo/credits/${seed.credit2Id}"]`)
			await link.scrollIntoViewIfNeeded()
			await expect(link).toBeVisible()
		})

		test('confirms a deduction, removes the confirm button, and updates the badge', async ({
			page,
		}) => {
			await page.goto(`/equipo/credits/${seed.credit1Id}`)
			await expect(mainDataTable(page)).toBeVisible()
			const row = mainDataTable(page).locator('tbody tr').first()
			await row.getByRole('button', { name: /confirmar/i }).click()
			const firstAfter = mainDataTable(page).locator('tbody tr').first()
			await expect(
				firstAfter.getByRole('button', { name: /confirmar/i }),
			).toHaveCount(0)
			await expect(
				firstAfter.getByText(/deducción confirmada/i).first(),
			).toBeVisible()
			await expect(
				firstAfter.getByText(/instalación pendiente/i).first(),
			).toBeVisible()
		})
	})

	test.describe('non-HR agent can view credit detail but cannot confirm', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, nonHrAgentDeductions.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('can view the credit detail page without a confirm button', async ({
			page,
		}) => {
			await page.goto(`/equipo/credits/${seed.credit1Id}`)
			await expect(mainDataTable(page)).toBeVisible()
			await expect(
				page.getByRole('button', { name: /confirmar/i }),
			).toHaveCount(0)
		})
	})
})

test.describe('Equipo credits list', () => {
	let seed: SeedDeductionsQueueResult

	test.beforeAll(async () => {
		await cleanupDeductionsQueue()
		seed = await seedDeductionsQueue(null)
	})

	test.afterAll(async () => {
		await cleanupDeductionsQueue()
	})

	test.describe('HR agent with company selected', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, hrAgentDeductions.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('shows the credits list page with a table', async ({ page }) => {
			await page.goto('/equipo/credits')
			await expect(
				page.getByRole('heading', { name: /créditos/i }),
			).toBeVisible()
			await expect(mainDataTable(page)).toBeVisible()
		})

		test('shows credits for the selected company', async ({ page }) => {
			await page.goto('/equipo/credits')
			await expect(mainDataTable(page)).toBeVisible()
			await expect(
				page.getByText(seed.applicant1Name, { exact: true }).first(),
			).toBeVisible()
			await expect(
				page.getByText(seed.applicant2Name, { exact: true }).first(),
			).toBeVisible()
		})

		test('links to the credit detail page from the employee name', async ({
			page,
		}) => {
			await page.goto('/equipo/credits')
			await expect(mainDataTable(page)).toBeVisible()
			const link = page.locator(`a[href="/equipo/credits/${seed.credit1Id}"]`)
			await link.scrollIntoViewIfNeeded()
			await expect(link).toBeVisible()
		})
	})

	test.describe('non-HR agent (payments) can also see the credits list', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, installmentsAgentDeductions.email)
			await setSelectedCompanyId(page, seed.companyId)
		})

		test('shows the credits list page', async ({ page }) => {
			await page.goto('/equipo/credits')
			await expect(
				page.getByRole('heading', { name: /créditos/i }),
			).toBeVisible()
			await expect(mainDataTable(page)).toBeVisible()
		})
	})
})

test.describe('Credit detail — confirm button visibility by payment state', () => {
	let seed: SeedCreditDetailPaymentStatesResult

	test.beforeAll(async () => {
		await cleanupCreditDetailPaymentStates()
		seed = await seedCreditDetailPaymentStates()
	})

	test.afterAll(async () => {
		await cleanupCreditDetailPaymentStates()
	})

	test.beforeEach(async ({ page }) => {
		await page.clock.setFixedTime(new Date('2023-01-05T00:00:00'))
		await loginPage(page, creditDetailStatesHrAgent.email)
		await setSelectedCompanyId(page, seed.companyId)
	})

	test('shows 5 payment rows with buttons only for delayed and upcoming-period installments', async ({
		page,
	}) => {
		await page.goto(`/equipo/credits/${seed.creditId}`)
		await expect(mainDataTable(page)).toBeVisible()
		await expect(mainDataTable(page).locator('tbody tr')).toHaveCount(5)

		const r0 = mainDataTable(page).locator('tbody tr').nth(0)
		await expect(r0.getByRole('button', { name: /confirmar/i })).toHaveCount(0)
		await expect(r0.getByText(/deducción confirmada/i).first()).toBeVisible()
		await expect(r0.getByText(/instalación atrasada/i).first()).toBeVisible()

		const r1 = mainDataTable(page).locator('tbody tr').nth(1)
		await expect(r1.getByText(/deducción atrasada/i).first()).toBeVisible()
		await expect(r1.getByRole('button', { name: /confirmar/i })).toBeVisible()

		const r2 = mainDataTable(page).locator('tbody tr').nth(2)
		await expect(r2.getByRole('button', { name: /confirmar/i })).toBeVisible()

		const r3 = mainDataTable(page).locator('tbody tr').nth(3)
		await expect(r3.getByRole('button', { name: /confirmar/i })).toHaveCount(0)

		const r4 = mainDataTable(page).locator('tbody tr').nth(4)
		await expect(r4.getByRole('button', { name: /confirmar/i })).toHaveCount(0)
	})

	test('shows paired deduction and installment status text with dates on the schedule', async ({
		page,
	}) => {
		await page.goto(`/equipo/credits/${seed.creditId}`)
		await expect(mainDataTable(page)).toBeVisible()

		const r0 = mainDataTable(page).locator('tbody tr').nth(0)
		const r0Deduction = r0.locator('td').nth(3)
		const r0Installment = r0.locator('td').nth(4)
		await expect(r0Deduction.getByText(/deducción confirmada/i)).toBeVisible()
		await expect(r0Deduction.getByText(/deducción registrada/i)).toBeVisible()
		await expect(r0Installment.getByText(/instalación atrasada/i)).toBeVisible()
		await expect(r0Installment.getByText(/fecha de pago/i)).toBeVisible()

		const r1 = mainDataTable(page).locator('tbody tr').nth(1)
		const r1Deduction = r1.locator('td').nth(3)
		const r1Installment = r1.locator('td').nth(4)
		await expect(r1Deduction.getByText(/deducción atrasada/i)).toBeVisible()
		await expect(r1Deduction.getByText(/fecha de pago/i)).toBeVisible()
		await expect(
			r1Installment.getByText(/en espera de deducción/i),
		).toBeVisible()

		const r2 = mainDataTable(page).locator('tbody tr').nth(2)
		const r2Deduction = r2.locator('td').nth(3)
		const r2Installment = r2.locator('td').nth(4)
		await expect(r2Deduction.getByText(/deducción pendiente/i)).toBeVisible()
		await expect(r2Deduction.getByText(/fecha de pago/i)).toBeVisible()
		await expect(
			r2Installment.getByText(/en espera de deducción/i),
		).toBeVisible()
	})
})
