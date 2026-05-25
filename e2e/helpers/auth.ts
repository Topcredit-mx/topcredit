import { type BrowserContext, expect, type Page } from '@playwright/test'
import { login as loginTask } from '~/e2e/server/tasks'

export const SESSION_COOKIE = 'next-auth.session-token'

export async function setSessionFromEmail(
	context: BrowserContext,
	email: string,
): Promise<void> {
	const token = await loginTask(email)
	await context.addCookies([
		{
			name: SESSION_COOKIE,
			value: token,
			domain: 'localhost',
			path: '/',
			httpOnly: true,
			sameSite: 'Lax',
		},
	])
}

export async function loginPage(page: Page, email: string): Promise<void> {
	const token = await loginTask(email)
	await page.context().addCookies([
		{
			name: SESSION_COOKIE,
			value: token,
			domain: 'localhost',
			path: '/',
			httpOnly: true,
			sameSite: 'Lax',
		},
	])
}

export async function setSelectedCompanyId(
	page: Page,
	companyId: number,
): Promise<void> {
	await page.context().addCookies([
		{
			name: 'selected_company_id',
			value: String(companyId),
			domain: 'localhost',
			path: '/',
		},
	])
}

export async function clearSelectedCompanyIdCookie(page: Page): Promise<void> {
	await page
		.context()
		.clearCookies({ name: 'selected_company_id', domain: 'localhost' })
}

export async function expectSignedOutOnLogin(page: Page): Promise<void> {
	await expect(page).toHaveURL(/\/login/)
	await expect(
		page.getByRole('heading', { name: /bienvenido a topcredit/i }),
	).toBeVisible()

	const cookies = await page.context().cookies()
	const sessionCookie = cookies.find((cookie) => cookie.name === SESSION_COOKIE)
	expect(sessionCookie).toBeUndefined()
}
