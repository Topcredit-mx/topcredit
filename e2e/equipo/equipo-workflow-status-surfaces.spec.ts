import { expect, test } from '@playwright/test'
import type {
	SeedDeductionsQueueResult,
	SeedInstallmentsOverdueResult,
} from '~/e2e/server/tasks'
import {
	cleanupDeductionsQueue,
	cleanupInstallmentsOverdue,
	seedDeductionsQueue,
	seedInstallmentsOverdue,
} from '~/e2e/server/tasks'
import { loginPage, setSelectedCompanyId } from '../helpers/auth'
import { findTableRow, mainDataTable } from '../helpers/interactions'
import { registerDbSpecGuards } from '../helpers/spec-hooks'
import { hrAgentDeductions } from './deductions-queue.fixtures'
import { installmentsOverdueAgent } from './installments-overdue.fixtures'

registerDbSpecGuards()

test.describe('Equipo workflow status UI across queue, overdue, and history', () => {
	let deductionsSeed: SeedDeductionsQueueResult
	let installmentsOverdueSeed: SeedInstallmentsOverdueResult

	// Seed in `beforeEach` (not `beforeAll`) so `getUpcomingDeductionDate` in the
	// DB matches the pay-period window the page uses with `new Date()` at
	// request time. A month change between `beforeAll` and navigation would
	// make `/equipo/deductions` show an empty Card (no `<table>` in `<main>`).
	test.beforeEach(async () => {
		await cleanupDeductionsQueue()
		await cleanupInstallmentsOverdue()
		deductionsSeed = await seedDeductionsQueue({ withOverdue: true })
		installmentsOverdueSeed = await seedInstallmentsOverdue()
	})

	test.afterAll(async () => {
		await cleanupDeductionsQueue()
		await cleanupInstallmentsOverdue()
	})

	test('shows aligned status badges and Mexico City timing on history in one pass', async ({
		page,
	}) => {
		await loginPage(page, hrAgentDeductions.email)
		await setSelectedCompanyId(page, deductionsSeed.companyId)

		await page.goto('/equipo/deductions')
		await expect(mainDataTable(page)).toBeVisible()
		const queueRow = findTableRow(page, deductionsSeed.applicant1Name)
		await expect(queueRow.getByText(/RH Pendiente/i).first()).toBeVisible()

		await page.goto('/equipo/deductions/overdue')
		await expect(mainDataTable(page)).toBeVisible()
		const overdueRow = findTableRow(page, deductionsSeed.overdueApplicantName)
		await expect(overdueRow.getByText(/RH pendiente/i).first()).toBeVisible()

		await page.goto('/equipo/deductions/history')
		await expect(mainDataTable(page)).toBeVisible()
		const mxEdgeRow = findTableRow(
			page,
			deductionsSeed.mxEdgeOnTimeApplicantName,
		)
		await expect(mxEdgeRow.getByText(/a tiempo/i).first()).toBeVisible()

		await loginPage(page, installmentsOverdueAgent.email)
		await setSelectedCompanyId(page, installmentsOverdueSeed.companyId)
		await page.goto('/equipo/installments/overdue')
		await expect(mainDataTable(page)).toBeVisible()
		const instRow = findTableRow(
			page,
			installmentsOverdueSeed.payrollInstallmentsBlocked,
		)
		await expect(
			instRow.getByText(/instalación pendiente/i).first(),
		).toBeVisible()
	})
})
