import { expect, type Page, type TestInfo } from '@playwright/test'

export type ApplicantPaymentScheduleRowSnapshot = {
	number: string
	dueDate: string
	amount: string
	status: string
}

export type ApplicantPaymentScheduleSnapshot = {
	headers: string[]
	rows: ApplicantPaymentScheduleRowSnapshot[]
}

function normalizeCellText(raw: string): string {
	return raw.replace(/\s+/g, ' ').trim()
}

export function applicantCreditPaymentScheduleTable(page: Page) {
	return page
		.getByRole('heading', {
			level: 2,
			name: /calendario de pagos/i,
		})
		.locator('xpath=ancestor::div[@data-slot="card"][1]')
		.getByRole('table')
}

export async function readApplicantPaymentScheduleSnapshot(
	page: Page,
): Promise<ApplicantPaymentScheduleSnapshot> {
	const table = applicantCreditPaymentScheduleTable(page)
	await expect(table).toBeVisible()

	const headerTexts = await table.locator('thead th').allInnerTexts()
	const headers = headerTexts.map(normalizeCellText)

	const rowCount = await table.locator('tbody tr').count()
	const rows: ApplicantPaymentScheduleRowSnapshot[] = []
	for (let i = 0; i < rowCount; i++) {
		const cellTexts = await table
			.locator('tbody tr')
			.nth(i)
			.locator('td')
			.allInnerTexts()
		if (cellTexts.length < 4) {
			throw new Error(
				`Expected 4 columns in payment schedule row ${i}, got ${cellTexts.length}`,
			)
		}
		const n = (idx: number) => normalizeCellText(cellTexts[idx] ?? '')
		rows.push({
			number: n(0),
			dueDate: n(1),
			amount: n(2),
			status: n(3),
		})
	}

	return { headers, rows }
}

export async function attachApplicantPaymentScheduleSnapshot(
	testInfo: TestInfo,
	name: string,
	snapshot: ApplicantPaymentScheduleSnapshot,
): Promise<void> {
	await testInfo.attach(name, {
		body: JSON.stringify(snapshot, null, 2),
		contentType: 'application/json; charset=utf-8',
	})
}
