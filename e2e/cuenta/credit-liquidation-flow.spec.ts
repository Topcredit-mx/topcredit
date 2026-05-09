import { expect, type Page, test } from '@playwright/test'
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
import {
	creditsApplicant,
	creditsEquipoAdmin,
	creditsLiquidationsAgent,
} from './credits.fixtures'

registerDbSpecGuards()

function formatMxFixtureAmount(value: string): string {
	return Number.parseFloat(value).toLocaleString('es-MX', {
		style: 'currency',
		currency: 'MXN',
	})
}

function requireLiquidationOutstandingStrings(seed: SeedCuentaCreditsResult): {
	principal: string
	financing: string
	total: string
} {
	const {
		liquidationOutstandingPrincipal: principal,
		liquidationOutstandingFinancing: financing,
		liquidationOutstandingTotal: total,
	} = seed
	if (principal === null || financing === null || total === null) {
		throw new Error('Expected seeded liquidation preview amounts')
	}
	return { principal, financing, total }
}

async function selectCreditsCompanyCookie(
	page: Page,
	companyId: number,
): Promise<void> {
	await page.context().addCookies([
		{
			name: 'selected_company_id',
			value: String(companyId),
			domain: 'localhost',
			path: '/',
			httpOnly: false,
			sameSite: 'Lax',
		},
	])
}

test.describe
	.serial('Liquidación solicitante → agente Liquidaciones', () => {
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

		test('diálogo de confirmación muestra montos programados del calendario y envía solicitud', async ({
			page,
		}, testInfo) => {
			const { principal, financing, total } =
				requireLiquidationOutstandingStrings(seed)
			const fmtP = formatMxFixtureAmount(principal)
			const fmtF = formatMxFixtureAmount(financing)
			const fmtT = formatMxFixtureAmount(total)

			expect(seed.creditId).not.toBeNull()
			await loginPage(page, creditsApplicant.email)
			await page.goto(`/cuenta/credits/${seed.creditId}`)
			const scheduleTable = applicantCreditPaymentScheduleTable(page)
			await expect(scheduleTable).toBeVisible()
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

			const cuentaPane = page.locator('[data-slot="sidebar-inset"]')
			await expect(cuentaPane.getByText(fmtP).first()).toBeVisible()
			await expect(cuentaPane.getByText(fmtF).first()).toBeVisible()
			await expect(cuentaPane.getByText(fmtT).first()).toBeVisible()

			await page.getByRole('button', { name: /solicitar liquidación/i }).click()
			const dialog = page.getByRole('alertdialog')
			await expect(dialog).toBeVisible()
			await expect(dialog.getByText(fmtP)).toBeVisible()
			await expect(dialog.getByText(fmtF)).toBeVisible()
			await expect(dialog.getByText(fmtT)).toBeVisible()

			await dialog.getByRole('button', { name: /confirmar y enviar/i }).click()
			await expect(page.getByText(/en revisión/i)).toBeVisible({
				timeout: 15_000,
			})
		})

		test('agente Liquidaciones revisa montos del calendario en detalle y acepta', async ({
			page,
		}) => {
			expect(seed.creditId).not.toBeNull()

			const { total } = requireLiquidationOutstandingStrings(seed)
			const fmtT = formatMxFixtureAmount(total)

			await loginPage(page, creditsLiquidationsAgent.email)
			await selectCreditsCompanyCookie(page, seed.companyId)
			await page.goto('/equipo/liquidations')
			await expect(
				page.getByRole('heading', { name: /liquidaciones/i }),
			).toBeVisible()

			await page
				.getByRole('link', { name: creditsApplicant.name })
				.first()
				.click()

			await expect(page).toHaveURL(/\/equipo\/liquidations\/\d+$/)

			await expect(
				page.getByText(/total pendiente \(calendario\)/i),
			).toBeVisible()
			await expect(page.getByText(fmtT).first()).toBeVisible()

			await page.getByRole('button', { name: /^aceptar$/i }).click()
			await expect(page).toHaveURL('/equipo/liquidations')
			await expect(
				page.getByText(/no hay solicitudes de liquidación pendientes/i),
			).toBeVisible()
		})

		test('después de aceptar, el calendario del solicitante marca saldos por liquidación', async ({
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
			await expect(scheduleTable).toBeVisible()
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

test.describe
	.serial('Liquidación — rechazo por agente', () => {
		let seedDeny: SeedCuentaCreditsResult

		test.beforeAll(async () => {
			await cleanupCuentaCredits()
			seedDeny = await seedCuentaCredits()
		})

		test.afterAll(async () => {
			await cleanupCuentaCredits()
		})

		test('solicitante envía desde el diálogo de confirmación', async ({
			page,
		}) => {
			expect(seedDeny.creditId).not.toBeNull()

			await loginPage(page, creditsApplicant.email)
			await page.goto(`/cuenta/credits/${seedDeny.creditId}`)
			await expect(
				page.getByRole('heading', { name: /liquidación anticipada/i }),
			).toBeVisible()
			await page.getByRole('button', { name: /solicitar liquidación/i }).click()
			const dialog = page.getByRole('alertdialog')
			await expect(dialog).toBeVisible()
			await dialog.getByRole('button', { name: /confirmar y enviar/i }).click()
			await expect(page.getByText(/en revisión/i)).toBeVisible({
				timeout: 15_000,
			})
		})

		test('agente rechaza la solicitud y la cola queda sin pendientes', async ({
			page,
		}) => {
			expect(seedDeny.creditId).not.toBeNull()

			await loginPage(page, creditsLiquidationsAgent.email)
			await selectCreditsCompanyCookie(page, seedDeny.companyId)
			await page.goto('/equipo/liquidations')
			await page
				.getByRole('link', { name: creditsApplicant.name })
				.first()
				.click()

			const denialNote = 'E2E rechazo liquidación'
			await page.locator('#liquidation-denial-reason').fill(denialNote)
			await page.getByRole('button', { name: /^rechazar$/i }).click()
			await expect(page).toHaveURL('/equipo/liquidations')
			await expect(
				page.getByText(/no hay solicitudes de liquidación pendientes/i),
			).toBeVisible()
		})

		test('solicitante puede iniciar de nuevo una solicitud tras el rechazo', async ({
			page,
		}) => {
			expect(seedDeny.creditId).not.toBeNull()

			await loginPage(page, creditsApplicant.email)
			await page.goto(`/cuenta/credits/${seedDeny.creditId}`)
			await expect(
				page.getByRole('button', { name: /solicitar liquidación/i }),
			).toBeVisible()
			await expect(page.getByText(/en revisión/i)).not.toBeVisible()
		})
	})

test.describe
	.serial('Liquidación — aceptación por administrador equipo', () => {
		let seedAdmin: SeedCuentaCreditsResult

		test.beforeAll(async () => {
			await cleanupCuentaCredits()
			seedAdmin = await seedCuentaCredits()
		})

		test.afterAll(async () => {
			await cleanupCuentaCredits()
		})

		test('admin acepta la solicitud pendiente', async ({ page }) => {
			expect(seedAdmin.creditId).not.toBeNull()

			await loginPage(page, creditsApplicant.email)
			await page.goto(`/cuenta/credits/${seedAdmin.creditId}`)
			await page.getByRole('button', { name: /solicitar liquidación/i }).click()
			await page
				.getByRole('alertdialog')
				.getByRole('button', { name: /confirmar y enviar/i })
				.click()
			await expect(page.getByText(/en revisión/i)).toBeVisible({
				timeout: 15_000,
			})

			await loginPage(page, creditsEquipoAdmin.email)
			await selectCreditsCompanyCookie(page, seedAdmin.companyId)
			await page.goto('/equipo/liquidations')
			await page
				.getByRole('link', { name: creditsApplicant.name })
				.first()
				.click()
			await expect(
				page.getByText(/financiamiento pendiente \(calendario\)/i),
			).toBeVisible()
			await page.getByRole('button', { name: /^aceptar$/i }).click()
			await expect(page).toHaveURL('/equipo/liquidations')
			await expect(
				page.getByText(/no hay solicitudes de liquidación pendientes/i),
			).toBeVisible()
		})
	})
