import { expect, test } from '@playwright/test'
import type { SeedCuentaCreditsResult } from '~/e2e/server/tasks'
import { cleanupCuentaCredits, seedCuentaCredits } from '~/e2e/server/tasks'
import {
	type ApplicantPaymentScheduleSnapshot,
	applicantCreditPaymentScheduleTable,
	attachApplicantPaymentScheduleSnapshot,
	readApplicantPaymentScheduleSnapshot,
} from '../helpers/applicant-payment-schedule-snapshot'
import { loginPage } from '../helpers/auth'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import { creditsApplicant, creditsLiquidationsAgent } from './credits.fixtures'

registerDbSpecGuards()

test.describe
	.serial('Credit liquidation request flow', () => {
		let seed: SeedCuentaCreditsResult
		let paymentScheduleBeforeRequest: ApplicantPaymentScheduleSnapshot | null =
			null
		let paymentScheduleAfterApproval: ApplicantPaymentScheduleSnapshot | null =
			null

		test.beforeAll(async () => {
			await cleanupCuentaCredits()
			seed = await seedCuentaCredits()
		})

		test.afterAll(async () => {
			await cleanupCuentaCredits()
		})

		test('applicant can submit a liquidation request from credit detail', async ({
			page,
		}, testInfo) => {
			expect(seed.creditId).not.toBeNull()
			await loginPage(page, creditsApplicant.email)
			await page.goto(`/cuenta/credits/${seed.creditId}`)
			const scheduleTable = applicantCreditPaymentScheduleTable(page)
			await scheduleTable.scrollIntoViewIfNeeded()
			paymentScheduleBeforeRequest =
				await readApplicantPaymentScheduleSnapshot(page)
			await attachApplicantPaymentScheduleSnapshot(
				testInfo,
				'applicant-payment-schedule-before-liquidation-request.json',
				paymentScheduleBeforeRequest,
			)
			await expect(
				page.getByRole('heading', { name: /liquidación anticipada/i }),
			).toBeVisible()
			await page.getByTestId('credit-liquidation-request-submit').click()
			await expect(page.getByText(/en revisión/i)).toBeVisible({
				timeout: 15_000,
			})
		})

		test('liquidations agent accepts the pending request', async ({ page }) => {
			expect(seed.creditId).not.toBeNull()
			await loginPage(page, creditsLiquidationsAgent.email)
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
			await page.goto('/equipo/liquidations')
			await expect(
				page.getByRole('heading', { name: /liquidaciones/i }),
			).toBeVisible()
			await page
				.getByRole('link', { name: creditsApplicant.name })
				.first()
				.click()
			await expect(page.getByTestId('liquidation-accept-submit')).toBeVisible()
			await page.getByTestId('liquidation-accept-submit').click()
			await expect(page).toHaveURL('/equipo/liquidations')
			await expect(
				page.getByText(/no hay solicitudes de liquidación pendientes/i),
			).toBeVisible()
		})

		test('applicant payment schedule after approval stamps unconfirmed rows as settled by liquidation', async ({
			page,
		}, testInfo) => {
			expect(seed.creditId).not.toBeNull()
			if (paymentScheduleBeforeRequest === null) {
				throw new Error('Expected paymentScheduleBeforeRequest from prior test')
			}

			const liquidationSettledLabel = 'Saldado por liquidación'

			await loginPage(page, creditsApplicant.email)
			await page.goto(`/cuenta/credits/${seed.creditId}`)
			const scheduleTable = applicantCreditPaymentScheduleTable(page)
			await scheduleTable.scrollIntoViewIfNeeded()
			paymentScheduleAfterApproval =
				await readApplicantPaymentScheduleSnapshot(page)
			await attachApplicantPaymentScheduleSnapshot(
				testInfo,
				'applicant-payment-schedule-after-liquidation-approved.json',
				paymentScheduleAfterApproval,
			)

			const expectedAfter: ApplicantPaymentScheduleSnapshot = {
				headers: paymentScheduleBeforeRequest.headers,
				rows: paymentScheduleBeforeRequest.rows.map((row, index) =>
					index <= 1 ? row : { ...row, status: liquidationSettledLabel },
				),
			}
			expect(paymentScheduleAfterApproval).toEqual(expectedAfter)
		})
	})
