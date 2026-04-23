import type { Locator, Page } from '@playwright/test'

/**
 * Many equipo (and other app) pages render more than one `<table>` inside `main`
 * (e.g. a compact summary + the main data grid). E2E assertions on `table` must
 * not use a bare `page.locator("table")` (Playwright strict mode). The primary
 * data grid in these flows is the last `table` in `main`.
 */
export function mainDataTable(page: Page): Locator {
	return page.getByRole('main').getByRole('table').last()
}

export async function selectRadix(
	page: Page,
	selector: string,
	optionText: string,
): Promise<void> {
	const byLabel = selector.startsWith('label:')
	const labelText = byLabel ? selector.slice(6) : selector

	if (selector.startsWith('[') || selector.startsWith('.')) {
		await page.locator(selector).first().click()
	} else if (!byLabel && /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(selector)) {
		await page
			.locator(`[name="${selector}"]:not(input[type="hidden"])`)
			.first()
			.click()
	} else {
		const main = page.getByRole('main')
		const label =
			(await main.count()) > 0
				? main
						.locator('label', {
							hasText: new RegExp(labelText, 'i'),
						})
						.first()
				: page
						.locator('label', {
							hasText: new RegExp(labelText, 'i'),
						})
						.first()
		const htmlFor = await label.getAttribute('for')
		if (!htmlFor) {
			throw new Error('label must have htmlFor')
		}
		await page.locator(`[id=${JSON.stringify(htmlFor)}]`).click()
	}

	const listbox = page.getByRole('listbox').first()
	await listbox.waitFor({ state: 'visible' })
	await page.getByRole('option', { name: optionText }).first().click()
}

export function findTableRow(page: Page, cellText: string): Locator {
	return mainDataTable(page)
		.getByRole('row')
		.filter({ has: page.getByRole('cell', { name: cellText }) })
}
