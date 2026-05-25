import { expect, type Page } from '@playwright/test'

export async function expectAccessDenied(page: Page) {
	await expect(page).not.toHaveURL(/\/unauthorized/)
	await expect(
		page.getByRole('heading', { name: '403 - No Autorizado' }),
	).toBeVisible()
}
