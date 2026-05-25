import { expect, test } from '@playwright/test'
import type { SeedDeductionsQueueResult } from '~/e2e/server/tasks'
import { cleanupDeductionsQueue, seedDeductionsQueue } from '~/e2e/server/tasks'
import { expectAccessDenied } from '../helpers/access-denied'
import { loginPage } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import {
	hrAgentDeductions,
	nonHrAgentDeductions,
} from './deductions-queue.fixtures'

registerDbSpecGuards()

test.describe('HR deduction confirmation history', () => {
	let seed: SeedDeductionsQueueResult

	test.beforeAll(async () => {
		await cleanupDeductionsQueue()
		seed = await seedDeductionsQueue(null)
	})

	test.afterAll(async () => {
		await cleanupDeductionsQueue()
	})

	test.describe('HR agent views deduction history on the deductions page', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, hrAgentDeductions.email)
			await page.context().addCookies([
				{
					name: 'selected_company_id',
					value: String(seed.companyId),
					domain: 'localhost',
					path: '/',
				},
			])
		})

		test('shows the deduction history section heading', async ({ page }) => {
			await page.goto('/equipo/deductions')
			await expect(page.getByText(/historial de confirmaciones/i)).toBeVisible()
		})

		test('shows confirmed deductions in the history list', async ({ page }) => {
			await page.goto('/equipo/deductions')
			await expect(
				page.getByRole('main').getByText(seed.confirmedApplicantName).first(),
			).toBeVisible()
		})

		test('shows who confirmed each deduction', async ({ page }) => {
			await page.goto('/equipo/deductions')
			await expect(
				page.getByRole('main').getByText(seed.confirmedByName).first(),
			).toBeVisible()
		})

		test('shows the on-time badge for a deduction confirmed before its due date', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions')
			const historyRow = page.locator('li', {
				has: page.getByText(seed.confirmedApplicantName, { exact: true }),
			})
			await expect(historyRow.getByText(/a tiempo/i).first()).toBeVisible()
		})

		test('shows the late badge for a deduction confirmed after its due date', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions')
			const historyRow = page.locator('li', {
				has: page.getByText(seed.lateConfirmedApplicantName, { exact: true }),
			})
			await expect(historyRow).toBeVisible()
			await expect(historyRow.getByText(/tarde/i).first()).toBeVisible()
		})

		test('orders history from most recent confirmation to oldest', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions')
			const main = page.getByRole('main')
			const confirmedLi = main
				.getByText(seed.confirmedApplicantName)
				.first()
				.locator('xpath=ancestor::li[1]')
			const lateLi = main
				.getByText(seed.lateConfirmedApplicantName)
				.first()
				.locator('xpath=ancestor::li[1]')
			const confirmedIndex = await confirmedLi.evaluate((el: HTMLElement) => {
				const li = el.closest('li')
				if (!li) return -1
				const ul = li.parentElement
				if (!ul) return -1
				return [...ul.querySelectorAll('li')].indexOf(li)
			})
			const lateIndex = await lateLi.evaluate((el: HTMLElement) => {
				const li = el.closest('li')
				if (!li) return -1
				const ul = li.parentElement
				if (!ul) return -1
				return [...ul.querySelectorAll('li')].indexOf(li)
			})
			expect(lateIndex).toBeGreaterThan(confirmedIndex)
		})

		test('shows a link to the application detail for each history row', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions')
			const link = page.locator(
				`a[href="/equipo/applications/${seed.confirmedApplicationId}"]`,
			)
			await link.scrollIntoViewIfNeeded()
			await expect(link).toBeVisible()
		})

		test('shows a link to the full history page', async ({ page }) => {
			await page.goto('/equipo/deductions')
			const link = page.getByRole('link', { name: /ver todo el historial/i })
			await link.scrollIntoViewIfNeeded()
			await expect(link).toBeVisible()
		})
	})

	test.describe('HR agent views the full deduction history page', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, hrAgentDeductions.email)
			await page.context().addCookies([
				{
					name: 'selected_company_id',
					value: String(seed.companyId),
					domain: 'localhost',
					path: '/',
				},
			])
		})

		test('shows the full history page with all confirmed deductions', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions/history')
			await expect(
				page
					.getByRole('navigation', { name: 'Breadcrumb' })
					.getByText(/historial/i),
			).toBeVisible()
			await expect(
				page.getByRole('main').getByText(seed.confirmedApplicantName).first(),
			).toBeVisible()
			await expect(
				page
					.getByRole('main')
					.getByText(seed.lateConfirmedApplicantName)
					.first(),
			).toBeVisible()
		})

		test('shows a back link to the deductions page', async ({ page }) => {
			await page.goto('/equipo/deductions/history')
			const link = page
				.getByRole('navigation', { name: 'Breadcrumb' })
				.getByRole('link', { name: /^deducciones$/i })
			await expect(link).toBeVisible()
			await expect(link).toHaveAttribute('href', '/equipo/deductions')
		})
	})

	test.describe('Non-HR agent cannot access deduction history', () => {
		test.beforeEach(async ({ page }) => {
			await loginPage(page, nonHrAgentDeductions.email)
			await page.context().addCookies([
				{
					name: 'selected_company_id',
					value: String(seed.companyId),
					domain: 'localhost',
					path: '/',
				},
			])
		})

		test('redirects to unauthorized when accessing the full history page', async ({
			page,
		}) => {
			await page.goto('/equipo/deductions/history')
			await expectAccessDenied(page)
		})
	})
})
