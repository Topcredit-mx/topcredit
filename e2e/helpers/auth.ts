import type { BrowserContext, Page } from '@playwright/test'
import { login as loginTask } from '~/e2e/server/tasks'

const SESSION_COOKIE = 'next-auth.session-token'

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
